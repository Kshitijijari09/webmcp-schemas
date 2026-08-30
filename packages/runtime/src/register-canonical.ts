import {
  CANONICAL_TOOLS,
  type CanonicalToolId,
  type InputOf,
  type OutputOf,
} from '@webmcp-schemas/schemas';
import { getModelContext } from './model-context.js';
import { validateArgs } from './validator.js';

export interface HandlerContext {
  signal: AbortSignal;
}

export type CanonicalHandler<Id extends CanonicalToolId> = (
  args: InputOf<Id>,
  ctx: HandlerContext,
) => Promise<OutputOf<Id>> | OutputOf<Id>;

export interface RegisterOptions {
  /**
   * Required for any tool whose canonical schema sets
   * `annotations.requiresConfirmation: true`. Called with the call's
   * arguments; the handler only runs if this resolves to `true`.
   */
  confirm?: (args: unknown) => boolean | Promise<boolean>;
}

export interface StructuredToolError {
  error: {
    type: 'validation_failed' | 'confirmation_declined';
    message: string;
    details?: string[];
  };
}

const activeRegistrations = new Set<string>();

function defaultConfirm(): never {
  throw new Error(
    'This tool requires confirmation before it runs (annotations.requiresConfirmation is true). ' +
      'Pass a `confirm` option to registerCanonical/registerPack — it will not auto-approve.',
  );
}

/**
 * Looks up a canonical schema by id, registers it via
 * `document.modelContext.registerTool` (or the deprecated
 * `navigator.modelContext` fallback), and returns an `unregister` function.
 * No-ops with a console warning — never throws — if WebMCP isn't available
 * in this browser.
 */
export function registerCanonical<Id extends CanonicalToolId>(
  id: Id,
  handler: CanonicalHandler<Id>,
  options: RegisterOptions = {},
): () => void {
  const tool = (
    CANONICAL_TOOLS as Record<string, (typeof CANONICAL_TOOLS)[CanonicalToolId] | undefined>
  )[id];
  if (!tool) {
    throw new Error(`registerCanonical: unknown canonical tool id "${String(id)}"`);
  }

  if (activeRegistrations.has(tool.id)) {
    throw new Error(
      `registerCanonical: "${tool.id}" is already registered. Call the unregister function returned ` +
        'by the previous registerCanonical call before registering it again.',
    );
  }

  const modelContext = getModelContext();
  if (!modelContext) {
    return () => {};
  }

  const controller = new AbortController();
  activeRegistrations.add(tool.id);

  const execute = async (args: unknown, ctx?: { signal?: AbortSignal }): Promise<unknown> => {
    const validation = validateArgs(tool.inputSchema, args);
    if (!validation.valid) {
      const structured: StructuredToolError = {
        error: {
          type: 'validation_failed',
          message: `Arguments for "${tool.id}" did not match its input schema.`,
          details: validation.errors,
        },
      };
      return structured;
    }

    if (tool.annotations.requiresConfirmation) {
      const confirm = options.confirm ?? defaultConfirm;
      const confirmed = await confirm(args);
      if (!confirmed) {
        const structured: StructuredToolError = {
          error: {
            type: 'confirmation_declined',
            message: `"${tool.id}" requires confirmation and was not confirmed.`,
          },
        };
        return structured;
      }
    }

    // Computing InputOf<CanonicalToolMap[Id]> here (inside the generic
    // function body, against an unresolved Id) sends FromSchema's recursive
    // conditional types into a combinatorial blowup across all registered
    // tools ("Type instantiation is excessively deep", verified empirically).
    // The public signature above still gives callers the precise, narrow
    // type; the implementation trusts it via a loose cast instead of asking
    // the compiler to re-prove it.
    const looseHandler = handler as unknown as (args: unknown, ctx: HandlerContext) => unknown;
    return looseHandler(args, { signal: ctx?.signal ?? controller.signal });
  };

  // The real @mcp-b/webmcp-polyfill / WebMCP registerTool signature is
  // `registerTool(tool, { signal }): Promise<void>` — tool lifetime is
  // owned by this signal (there's no separate unregisterTool()). Passing
  // controller.signal here, not just guarding on it internally, is what
  // makes the unregister() below actually remove the registration rather
  // than just stop our own execute wrapper from doing anything.
  const registration = modelContext.registerTool(
    {
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
      execute,
    },
    { signal: controller.signal },
  );
  if (registration && typeof (registration as Promise<void>).catch === 'function') {
    (registration as Promise<void>).catch((error: unknown) => {
      console.error(`[@webmcp-schemas/runtime] registerTool("${tool.name}") rejected:`, error);
    });
  }

  return () => {
    controller.abort();
    activeRegistrations.delete(tool.id);
  };
}
