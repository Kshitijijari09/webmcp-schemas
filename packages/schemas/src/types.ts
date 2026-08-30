import type { FromSchema } from 'json-schema-to-ts';

export interface CanonicalTool<Input extends object = object, Output extends object = object> {
  readonly id: string;
  readonly name: string;
  readonly title: string;
  readonly description: string;
  readonly inputSchema: Input;
  readonly outputSchema: Output;
  readonly annotations: {
    readonly readOnlyHint: boolean;
    readonly untrustedContentHint: boolean;
    readonly requiresConfirmation: boolean;
  };
  readonly stability: 'draft' | 'stable';
  readonly version: string;
}

/** Turns a tuple of canonical tools into a map keyed by each tool's `id`. */
export type ById<Tools extends readonly { readonly id: string }[]> = {
  [T in Tools[number] as T['id']]: T;
};

// Generic, tool-keyed FromSchema derivation. Cheap and correct at a
// concrete, non-generic T (used directly in this package to build
// registry.ts's ResolvedIO table, and by types.type-check.ts's fixture) —
// but re-running FromSchema against `CanonicalToolMap[Id]['inputSchema']`
// for an unresolved, still-generic Id blows past `tsc`'s instantiation
// depth limit (verified empirically). Downstream packages should use
// registry.ts's id-keyed `InputOf`/`OutputOf` (backed by the pre-resolved
// ResolvedIO table) instead of applying these directly to a generic Id
// lookup. See ADR 0001.
export type SchemaInputOf<T extends CanonicalTool> = FromSchema<T['inputSchema']>;
export type SchemaOutputOf<T extends CanonicalTool> = FromSchema<T['outputSchema']>;
