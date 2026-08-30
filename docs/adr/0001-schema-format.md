# 0001 — Canonical schema file format

Status: accepted

## Context

Every canonical tool needs a shape that is simultaneously: easy for a
non-TypeScript contributor to author and review in a PR diff, directly
usable as the `inputSchema`/`outputSchema` WebMCP itself expects,
strict enough for `webmcp-lint` to detect drift mechanically, and
precise enough that `@webmcp-schemas/runtime`'s
`registerCanonical('retail.add_to_cart', handler)` can type-check
`handler`'s arguments and return value against that same source of
truth.

## Decision

**One JSON file per tool, plus a sibling example, organised by
vertical:**

```
packages/schemas/src/schemas/retail/search_products.json
packages/schemas/src/schemas/retail/search_products.example.json
```

(Nested under `src/`, not a sibling of it — `tsc`'s `rootDir` requires
every file it type-checks, including JSON files imported for their
literal types, to live under `rootDir`. Keeping the data under `src/`
avoids fighting that constraint while keeping the `schemas/<vertical>/
<tool_name>.json` shape this section is actually about.)

Each canonical file has this envelope:

```json
{
  "id": "retail.search_products",
  "name": "search_products",
  "title": "Search products",
  "description": "Search the catalog by free-text query and optional filters. Use this to find products by name/keyword; use check_stock instead if you already have a specific product and only need availability.",
  "inputSchema": { "type": "object", "...": "JSON Schema draft 2020-12" },
  "outputSchema": { "type": "object", "...": "JSON Schema draft 2020-12" },
  "annotations": {
    "readOnlyHint": true,
    "untrustedContentHint": false,
    "requiresConfirmation": false
  },
  "stability": "draft",
  "version": "0.1.0"
}
```

- **`id`** is namespaced (`<vertical>.<name>`) so two verticals can
  never collide in a flat registry, even though most consumers will
  only ever import one vertical.
- **`name`** is the bare, unnamespaced tool name — what actually gets
  passed to `document.modelContext.registerTool`. It's redundant with
  the tail of `id` by construction; the meta-schema enforces that
  redundancy stays consistent rather than letting it drift.
- **`description`** is written as LLM-facing tool-selection guidance,
  not human documentation — see `SCHEMA_STYLE.md` for the rubric.
- **`annotations.requiresConfirmation`** is our own extension beyond
  the two hints WebMCP defines (`readOnlyHint`, `untrustedContentHint`).
  It drives `@webmcp-schemas/runtime`'s confirmation-wrapping behavior
  (see ADR 0002, once written alongside Stage 4).
- **`stability`** and **`version`** exist per-file even though the
  package as a whole is versioned as one semver unit (see CLAUDE.md).
  They let `schemas.yml` CI enforce a narrower rule: a file marked
  `stable` cannot change without its own `version` bumping, which is a
  stronger check than "the package's version changed" would give you
  on its own.

## Alternatives considered and rejected

**TypeScript as the source of truth, JSON generated at build time.**
Rejected because it makes the registry TypeScript-only to review and
contribute to — a JSON Schema is something a non-TS engineer, or a
tool from another ecosystem, can read and validate directly. This was
already decided in the original project brainstorm; restated here
because it directly shapes the choice below.

**YAML instead of JSON.** Rejected: `inputSchema`/`outputSchema` are
JSON Schema by definition, so authoring the envelope in JSON keeps the
whole file in one syntax instead of mixing YAML-for-envelope with
JSON-Schema-that-happens-to-also-be-valid-YAML. JSON also has
simpler, more universal tooling for the meta-schema validation step.

**Flat, unnamespaced tool names as the primary key** (e.g. just
`search_products`, no vertical prefix). Rejected: it's the exact
failure mode this project exists to fix in miniature — two verticals
independently need `get_status`-shaped tools, and a flat namespace
forces a fight over who owns the name. The namespaced `id` sidesteps
it; `name` stays flat because that's what a single site actually
registers, and a site only ever pulls in tools from the verticals it
needs.

**Generated `.d.ts` files via a codegen script** (e.g.
`json-schema-to-typescript` run as a build step, emitting committed or
gitignored type files). This is the most consequential alternative
considered, so it gets its own section below.

## Type generation: derived types via a mechanical mirror, not hand-written interfaces

We use [`json-schema-to-ts`](https://github.com/ThomasAribart/json-schema-to-ts)'s
`FromSchema<S>` — a compile-time-only type utility — rather than
hand-writing or generating `.d.ts` interfaces per tool.

**Correction (this section originally claimed a plain `import data from
'./x.json'` gets literal types under `resolveJsonModule`, "equivalent
to `as const`." That's wrong — verified empirically: TypeScript widens
JSON module imports to their base types (`string`, `number`), the same
as an untyped object literal without `as const`. `FromSchema` needs
literal types — `"object"`, not `string` — to do anything useful, so a
plain JSON import doesn't work as the direct input to it.**

The fix: `scripts/generate-ts-mirrors.mjs` reads every canonical
`.json` file and writes a sibling file under `src/generated/<vertical>/
<tool_name>.ts` containing nothing but
`const tool = { ...same JSON content... } as const; export default
tool;`. This is a mechanical passthrough — no interface synthesis, no
judgment calls, just JSON re-serialized as a `const`-asserted TS
literal — run via a `generate` script wired into `pretest`/`prebuild`/
`pretypecheck`, gitignored, and cheap enough to regenerate on every
install. `registry.ts` imports the generated mirrors (not the raw
JSON) to build `CANONICAL_TOOLS` and derive types via `FromSchema`;
`validate.ts` and the meta-schema tests still read the raw `.json`
files directly, unaffected by any of this.

This is a much narrower form of the "generated files" alternative
rejected above — it's not generating type interfaces (a judgment-laden
transform that can drift from what a human would have written by
hand), it's re-asserting the same literal data at a location TypeScript
will actually narrow. The risk profile is closer to "recompiling a
build artifact" than "maintaining generated source."

This costs us the small minority of JSON Schema keywords
`json-schema-to-ts` doesn't model at the type level (complex
`if`/`then`/`else`, some `$ref` shapes). That's an acceptable trade:
`SCHEMA_STYLE.md` and the meta-schema already restrict canonical
`inputSchema`/`outputSchema` to a plain, restrained keyword subset
(`type`, `properties`, `required`, `enum`, `additionalProperties`,
`items`, numeric bounds) for LLM-legibility reasons independent of
this decision. `json-schema-to-ts` is a devDependency of
`packages/schemas` — it contributes zero bytes to the built output,
since only its types are imported (`import type`), never its runtime
code (it has none).

`packages/schemas`'s own meta-schema validation (checking that
canonical files conform to the envelope above, and that
`inputSchema`/`outputSchema` are themselves valid JSON Schema
2020-12) is a separate, CI-only concern from type generation. It uses
`ajv` as a devDependency, invoked only by `pnpm --filter
@webmcp-schemas/schemas validate` and by tests — never bundled into
the package's published `dist/`.
