import type { CanonicalTool, CanonicalToolId, InputOf, OutputOf } from '@webmcp-schemas/schemas';
import {
  registerCanonical,
  type HandlerContext,
  type RegisterOptions,
} from './register-canonical.js';

type VerticalTools = Record<string, CanonicalTool>;

// InputOf/OutputOf are id-keyed (a cheap lookup into a pre-resolved table —
// see registry.ts's ResolvedIO and ADR 0001), so each tool's literal `id`
// field needs picking out and narrowing to CanonicalToolId first.
type IdOf<T extends CanonicalTool> = T['id'] extends CanonicalToolId ? T['id'] : never;

type PackHandlers<V extends VerticalTools> = {
  [K in keyof V]?: (
    args: InputOf<IdOf<V[K]>>,
    ctx: HandlerContext,
  ) => Promise<OutputOf<IdOf<V[K]>>> | OutputOf<IdOf<V[K]>>;
};

/**
 * Bulk-registers a subset of a vertical's tools (e.g. the object exported
 * from `@webmcp-schemas/schemas/retail`). Throws — before registering
 * anything — if `handlers` names a key that isn't part of `vertical`.
 * Returns a single function that unregisters everything this call
 * registered.
 */
export function registerPack<V extends VerticalTools>(
  vertical: V,
  handlers: PackHandlers<V>,
  options: RegisterOptions = {},
): () => void {
  // Cast the whole parameter to a loose shape *before* touching it, and
  // never reference the precisely-typed `handlers` again below. Calling
  // Object.entries(handlers) directly — even inside a cast expression —
  // still forces the compiler to instantiate PackHandlers<V>'s member types
  // (InputOf<V[K]> for every key), hitting the same FromSchema blowup
  // documented in register-canonical.ts. Casting first means Object.entries
  // only ever sees the simple loose type.
  type LooseHandlers = Record<
    string,
    ((args: unknown, ctx: HandlerContext) => unknown) | undefined
  >;
  const looseHandlers = handlers as unknown as LooseHandlers;
  const entries = Object.entries(looseHandlers);

  for (const [key] of entries) {
    if (!(key in vertical)) {
      throw new Error(`registerPack: unknown tool "${key}" for this vertical`);
    }
  }

  const unregisterFns: Array<() => void> = [];
  for (const [key, handler] of entries) {
    if (!handler) continue;
    // Already validated above that `key in vertical`, so this is defined.
    const tool = vertical[key]!;
    unregisterFns.push(registerCanonical(tool.id as never, handler as unknown as never, options));
  }

  return () => {
    for (const unregister of unregisterFns) {
      unregister();
    }
  };
}
