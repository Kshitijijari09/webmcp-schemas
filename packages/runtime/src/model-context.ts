export interface RegisterToolInput {
  name: string;
  description: string;
  inputSchema: object;
  // The real @mcp-b/webmcp-polyfill / WebMCP execute signature takes only
  // `input` — there is no per-call context argument. `ctx` here is optional
  // and only ever populated by our own tests/mocks; production calls from
  // the real polyfill omit it, which is why register-canonical.ts falls
  // back to its own registration-lifetime AbortSignal when ctx.signal is
  // absent. See ADR notes in register-canonical.ts.
  execute: (args: unknown, ctx?: { signal?: AbortSignal }) => Promise<unknown> | unknown;
}

export interface RegisterToolOptions {
  signal?: AbortSignal;
}

export interface ModelContextLike {
  registerTool(tool: RegisterToolInput, options?: RegisterToolOptions): unknown;
}

function hasModelContext(value: unknown): value is { modelContext: ModelContextLike } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'modelContext' in value &&
    (value as { modelContext?: unknown }).modelContext != null
  );
}

/**
 * Feature-detects the WebMCP root object. Prefers `document.modelContext`
 * (the current API); falls back to the deprecated `navigator.modelContext`
 * with a warning. Returns `undefined` (after warning once) if neither is
 * present — callers must never throw just because a browser doesn't
 * support WebMCP yet.
 */
export function getModelContext(): ModelContextLike | undefined {
  const doc: unknown = (globalThis as { document?: unknown }).document;
  if (hasModelContext(doc)) {
    return doc.modelContext;
  }

  const nav: unknown = (globalThis as { navigator?: unknown }).navigator;
  if (hasModelContext(nav)) {
    console.warn(
      '[@webmcp-schemas/runtime] navigator.modelContext is deprecated; WebMCP moved this to document.modelContext. Registering via the deprecated fallback.',
    );
    return nav.modelContext;
  }

  console.warn(
    '[@webmcp-schemas/runtime] document.modelContext is not available. Load @mcp-b/webmcp-polyfill, or run in a browser with WebMCP support, for tools to register.',
  );
  return undefined;
}
