# @webmcp-schemas/runtime

Registers canonical WebMCP schemas on top of the existing
`@mcp-b/webmcp-polyfill` (a `peerDependency`, never bundled) — never
reimplements the polyfill.

```ts
import { initializeWebMCPPolyfill } from '@mcp-b/webmcp-polyfill';
import { registerCanonical } from '@webmcp-schemas/runtime';

initializeWebMCPPolyfill();

const unregister = registerCanonical('retail.search_products', async ({ query }) => {
  return await mySearchFunction(query);
});
```

Three functions, no more:

- **`registerCanonical(id, handler, options?)`** — looks up the
  canonical schema, validates arguments against it before calling
  `handler`, registers it via `document.modelContext.registerTool`,
  and returns an `unregister` function. No-ops with a `console.warn`
  (never throws) if `document.modelContext` isn't available. If the
  tool's `requiresConfirmation` is set, `handler` only runs after a
  caller-supplied `confirm` option returns `true`.
- **`registerPack(vertical, handlers)`** — bulk `registerCanonical`
  over a whole vertical object (e.g. the one exported from
  `@webmcp-schemas/schemas/retail`); throws on an unknown tool key.
- **`extendCanonical(id, { inputSchema })`** — additive-only extension
  of a canonical schema; rejects any change that retypes an existing
  canonical field.

Zero third-party runtime dependencies. See the
[repo root README](../../README.md) for the full picture.
