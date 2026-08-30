# @webmcp-schemas/schemas

Canonical JSON Schema registry for WebMCP tools, organised by industry
vertical. Data and generated types only — zero runtime dependencies,
no runtime logic.

```ts
import { retail, CANONICAL_TOOLS } from '@webmcp-schemas/schemas';
import { retail as retailOnly } from '@webmcp-schemas/schemas/retail';

retail.search_products.inputSchema; // the raw JSON Schema
CANONICAL_TOOLS['retail.search_products']; // the same tool, looked up by id
```

Types (`InputOf<Id>` / `OutputOf<Id>`) are derived from each schema via
[`json-schema-to-ts`](https://github.com/ThomasAribart/json-schema-to-ts)'s
`FromSchema`, using auto-generated `as const` mirrors under
`src/generated/` (never hand-edited — see
[ADR 0001](../../docs/adr/0001-schema-format.md) for why plain JSON
imports don't give TypeScript literal types on their own, and how this
works around that).

Currently ships one vertical: **retail** (7 tools) — see
[`docs/verticals/retail.md`](../../docs/verticals/retail.md).

See the [repo root README](../../README.md) for the full picture, and
[`CONTRIBUTING.md`](../../CONTRIBUTING.md) for how to propose a new
tool or vertical.
