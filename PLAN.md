# PLAN.md — webmcp-schemas task breakdown

Six stages, each with an explicit review checkpoint before the next
begins. See CLAUDE.md for the constraints and rationale behind each
decision referenced below.

## Stage 1 — Scaffold ✅ done

pnpm monorepo: `packages/schemas`, `packages/runtime`, `packages/lint`,
`examples/storefront` (Vite vanilla-TS). Root config: TypeScript
strict mode, tsup, vitest, eslint + prettier, `.editorconfig`,
`.gitignore`, MIT `LICENSE`, `.nvmrc`, changesets. Every package has a
stub `README.md`. No logic implemented. `pnpm install` and `pnpm
build` verified working across all four packages.

## Stage 2 — Schema format

The most important design decision — do this carefully, with an ADR.

- [ ] Write `docs/adr/0001-schema-format.md`: the chosen format, and
      the alternatives considered and rejected (e.g. YAML vs JSON,
      flat vs namespaced `id`, TS-source-of-truth vs JSON-source-of-truth)
- [ ] Define the canonical file shape in `packages/schemas`: one JSON
      file per tool at `schemas/<vertical>/<tool_name>.json`, with
      `id` (e.g. `retail.search_products`), `name`, `title`,
      `description` (LLM-facing guidance, not documentation prose),
      `inputSchema` (JSON Schema draft 2020-12), `outputSchema`,
      `annotations` (`readOnlyHint`, `untrustedContentHint`,
      `requiresConfirmation`), `stability` (`draft | stable`), `version`
- [ ] Write the meta-schema that validates every canonical file
- [ ] Wire the meta-schema validator into CI (fails the build on any
      non-conforming schema file)
- [ ] Build the type generation step: canonical schemas → generated
      TS types, such that `registerCanonical('retail.add_to_cart', fn)`
      type-checks `fn`'s arguments and return value against the
      canonical shapes
- [ ] Index export so a consumer can enumerate a whole vertical
      (e.g. `import * as retail from '@webmcp-schemas/schemas/retail'`)
- [ ] Tests: meta-schema validator (valid + invalid fixtures), generated
      types compile
- [ ] No tool content yet — this stage is format + tooling only

## Stage 3 — First vertical: retail

Author the retail pack, one design/author/document/test cycle that
later verticals repeat.

- [ ] `search_products` (read)
- [ ] `apply_filters` (read)
- [ ] `check_stock` (read) — description must explicitly disambiguate
      from `search_products`
- [ ] `add_to_cart` (write, `requiresConfirmation: true`)
- [ ] `apply_promo_code` (write, `requiresConfirmation: true`)
- [ ] `get_order_status` (read)
- [ ] `start_return` (write, `requiresConfirmation: true`)
- [ ] Every tool: description written as if an LLM must pick between
      all seven with no other context; minimal required input fields,
      optional extensions second; enums wherever the value space is closed
- [ ] Every reader tool: `readOnlyHint: true`
- [ ] `docs/verticals/retail.md` — one section per tool + a worked
      end-to-end example
- [ ] Tests: every retail file validates against the Stage 2
      meta-schema; generated types compile

**Later** (not part of this plan's active scope — repeat this stage's
process one vertical at a time, shipping and reviewing each before
starting the next): travel, restaurants, banking, insurance,
healthcare-admin, saas, support, real-estate, logistics, government,
jobs, events, education.

## Stage 4 — Runtime

Implement `packages/runtime`.

- [ ] `registerCanonical(id, handler, options?)`: look up the
      canonical schema, register via `document.modelContext.registerTool`,
      return an `unregister` function backed by `AbortSignal`
- [ ] `registerPack(vertical, handlers)`: bulk register; throw on
      unknown ids
- [ ] `extendCanonical(id, { inputSchema })`: additive-only; reject any
      change that removes or retypes a canonical field
- [ ] Feature-detect `document.modelContext`; no-op with a single
      `console.warn` if absent — never throw for lack of browser support
- [ ] Support `navigator.modelContext` as a deprecated fallback
- [ ] `requiresConfirmation` handling: wrap the handler so it resolves
      only after a caller-supplied `confirm` callback returns `true`;
      default `confirm` throws ("you must supply a confirmation
      handler") rather than auto-approving
- [ ] Validate arguments against the canonical `inputSchema` before
      invoking the handler; return a structured error the agent can
      act on when validation fails
- [ ] Pass `execute`'s `AbortSignal` (second argument) through to the handler
- [ ] Unit tests with a mocked `document.modelContext`: no-support
      path, confirmation path, argument validation failure, abort
      mid-execution, double registration

## Stage 5 — Linter

Implement the `webmcp-lint` CLI in `packages/lint`.

- [ ] `webmcp-lint static <glob>`: scan source for `registerTool`
      calls; report tools duplicating a canonical concept under a
      non-canonical name, missing descriptions, missing
      `readOnlyHint`, untyped object blobs, descriptions under 20 chars
- [ ] `webmcp-lint live <url>`: launch Playwright with the polyfill
      injected, enumerate `document.modelContext.getTools()`, run the
      same checks against what actually registers
- [ ] Human-readable output by default; `--format json` for CI
- [ ] Non-zero exit on error-level findings only
- [ ] GitHub Action wrapper: `.github/actions/webmcp-lint`
- [ ] Tests: fixture source files (static mode) + a fixture HTML page
      (live mode)

## Stage 6 — Demo

Build `examples/storefront`.

- [ ] Product grid, filters, cart, order lookup — vanilla TS + Vite,
      no UI framework, no CSS framework; plain but not ugly
- [ ] Load `@mcp-b/webmcp-polyfill` so it works outside Chrome
- [ ] Wire every canonical retail tool to real page behaviour — tool
      calls must visibly change the UI
- [ ] On-page log panel showing each tool call with its arguments
- [ ] GitHub Pages deploy workflow

## Explicitly out of scope for this plan

- Any vertical beyond retail, until retail has shipped and been used
  in at least one real integration cycle.
- RFC-before-PR governance process.
- Any framework hook package, polyfill work, or browser extension —
  explicit non-goals in CLAUDE.md.
