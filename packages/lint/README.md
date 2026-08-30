# @webmcp-schemas/lint

`webmcp-lint` checks a site's registered WebMCP tools against the
canonical schema registry (`@webmcp-schemas/schemas`).

## CLI

```bash
webmcp-lint static "src/**/*.ts"     # scans source for registerTool(...) calls, no browser
webmcp-lint live https://example.com # launches headless Chromium with the polyfill injected,
                                      # enumerates document.modelContext.getTools()
```

Add `--format json` for machine-readable output in CI. Exit code is
non-zero only when a finding is `error`-level (currently: a tool with no
`description` at all); everything else is an advisory `warning` that
doesn't fail the build.

## Checks (both modes run the same rules)

- **`missing-description`** (error) — the tool has no `description`.
- **`short-description`** (warning) — description under 20 characters,
  too short for an agent to disambiguate it from similar tools.
- **`missing-readonly-hint`** (warning) — `annotations.readOnlyHint` isn't set.
- **`untyped-schema-property`** (warning) — an `inputSchema` property has
  no `type` (and no `enum`/`$ref`).
- **`possible-duplicate`** (warning) — heuristic only: the tool's name
  looks like a `verb_noun` duplicate of a canonical tool under a
  different verb (e.g. `find_products` vs. the canonical
  `search_products`). Never a hard error — it's a suggestion, and it can
  have false positives.

## GitHub Action

A composite action wrapper lives at
[`.github/actions/webmcp-lint`](../../.github/actions/webmcp-lint) — see
its `action.yml` for inputs (`mode`, `target`, `format`, `version`).

## Programmatic API

```ts
import { runStatic, runLive, runChecks } from '@webmcp-schemas/lint';
```

`runStatic(glob, canonicalTools)` and `runLive(url, canonicalTools)` both
return `Promise<Finding[]>`; `runChecks(tool, canonicalTools)` runs the
rules against a single already-extracted tool.
