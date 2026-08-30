# webmcp-schemas

## What this is

A community registry of canonical tool schemas for [WebMCP](https://github.com/webmachinelearning/webmcp) —
the proposed W3C standard (Chrome + Edge, incubated in the Web Machine
Learning Community Group) that lets a web page register typed tools
in-browser AI agents can call directly via
`document.modelContext.registerTool({ name, description, inputSchema, execute })`,
instead of scraping the DOM.

**The problem:** there is no shared vocabulary for tool names and
schemas. If one retailer registers `search_products`, another
`productSearch`, and a third `find_items`, every agent has to relearn
every site. `robots.txt` standardised where crawlers may go;
schema.org standardised what your things are; nothing standardises
what your site can do.

**The project:** a registry of canonical tool schemas per industry
(`packages/schemas`), a tiny runtime that registers them on top of the
existing WebMCP polyfill (`packages/runtime`), and a linter that
checks a site's tools against the canonical shapes
(`packages/lint`).

WebMCP itself is unstable: a Draft Community Group Report, live in a
Chrome origin trial from Chrome 149, and the root registration object
recently moved from `navigator.modelContext` to `document.modelContext`.
Expect the upstream API to keep shifting; isolate assumptions about it
behind the runtime package.

## Non-goals

- **No polyfill.** This project sits on top of `@mcp-b/webmcp-polyfill`
  and must never reimplement it. The runtime package declares it as a
  `peerDependency`, not a bundled dependency, and assumes
  `document.modelContext` already exists on the page.
- **No framework hook library.** `usewebmcp` and `@mcp-b/react-webmcp`
  already exist for React. Don't build another one.
- **No browser extension.**
- **No agent implementation.** This project defines what tools _look
  like_; it does not build anything that _calls_ them.

## Repo layout

```
webmcp-schemas/
├── packages/
│   ├── schemas/    @webmcp-schemas/schemas  — canonical JSON Schema files, one per tool, grouped by industry vertical; generated TS types
│   ├── runtime/    @webmcp-schemas/runtime  — registerCanonical / registerPack / extendCanonical
│   └── lint/       @webmcp-schemas/lint     — webmcp-lint CLI (static + live modes) + programmatic API
├── examples/
│   └── storefront/ vanilla-TS + Vite demo site wiring the retail pack to real page behaviour
├── docs/
│   ├── adr/        architecture decision records (e.g. 0001-schema-format.md)
│   └── verticals/  one doc per shipped vertical, with a worked example
├── .changeset/     changesets config, for versioning/publishing the three packages independently
├── pnpm-workspace.yaml
├── package.json    root: private, workspace scripts only
├── PLAN.md
└── README.md
```

## Constraints (non-negotiable)

- TypeScript, pnpm workspaces, ESM-first with a CJS build (tsup),
  Node 22.13+. (Originally targeted Node 20+; raised after discovering
  in CI that the pinned `packageManager: pnpm@11.24.0` itself requires
  Node ≥22.13 — pnpm's own floor, not a project choice.)
- **Zero third-party runtime dependencies** in `packages/schemas` and
  `packages/runtime` — the two packages that ship to browsers.
  `@mcp-b/webmcp-polyfill` is a `peerDependency` of `runtime`, never a
  regular dependency, and is never bundled. A workspace-internal
  dependency on `@webmcp-schemas/schemas` (from `runtime` and `lint`)
  doesn't count against this — it's our own package, not a third-party
  one. `packages/lint` is a Node-only CLI and is exempt: it needs real
  dependencies (Playwright for `webmcp-lint live`, a JSON Schema
  validator, etc.) since nothing it depends on ships to a browser.
- MIT licence.
- vitest for tests, tsup for builds.
- Public API surface must stay small enough to explain in a five-line
  README example. If a change grows the runtime package's API past
  one function, that's a signal to stop and reconsider, not to add
  documentation.
- npm packages publish under the `@webmcp-schemas/` scope.

## Schema authoring rules

Each tool is a standalone JSON file plus a sibling example, organised
by vertical:

```
packages/schemas/schemas/retail/search_products.json
packages/schemas/schemas/retail/search_products.example.json
```

Full field set (see `docs/adr/0001-schema-format.md` for the rationale
and rejected alternatives): `id` (namespaced, e.g. `retail.search_products`),
`name`, `title`, `description` (written as guidance for an LLM
choosing between tools, not documentation prose), `inputSchema` and
`outputSchema` (JSON Schema draft 2020-12), `annotations`
(`readOnlyHint`, `untrustedContentHint`, and our own
`requiresConfirmation`), `stability` (`draft | stable`), and
`version`. Every canonical file must validate against the meta-schema
in `packages/schemas`, enforced in CI.

**Naming convention:** `verb_noun`, snake_case, for both `name` and
the tail of `id`. The verb comes from a small, deliberately controlled
vocabulary that only grows by consensus: `search`, `get`, `add`,
`remove`, `update`, `create`, `cancel`, `apply`, `check`, `start`. The
noun is the domain object the verb acts on. This convention _is_ the
product — don't deviate from it casually, and challenge any PR that
introduces a new verb without discussion.

`inputSchema` requires only what's truly required; optional extensions
come second. Prefer enums wherever the value space is closed. Every
`description` must disambiguate the tool from its siblings in the same
vertical, written as if an LLM must pick between all of that vertical's
tools with no other context.

Reads get `readOnlyHint: true`. Any tool with a side effect a user
would want to confirm (adding to a cart, applying a promo code,
starting a return, etc.) gets `requiresConfirmation: true` — see
`packages/runtime`'s confirmation-wrapping behaviour, which refuses to
auto-approve these.

## Versioning

`@webmcp-schemas/schemas` is versioned as a single package — there is
no per-schema-file version field.

- Renaming/removing a tool, tightening a type, or removing a field:
  **major**.
- Adding a new tool or industry: **minor**.
- Fixing a description/typo: **patch**.

This keeps version resolution trivial (one version, one npm install)
at the cost of forcing unrelated industries to share a major-version
bump when any one of them has a breaking change. Acceptable at this
project's scale; revisit only if the registry grows large enough for
that coupling to actually hurt.

## Initial scope

Seed vertical: **retail**, seven tools, chosen to prove the schema
format, runtime, and linter end-to-end before any other industry is
added:

- `search_products` (read)
- `apply_filters` (read)
- `check_stock` (read)
- `add_to_cart` (write, `requiresConfirmation`)
- `apply_promo_code` (write, `requiresConfirmation`)
- `get_order_status` (read)
- `start_return` (write, `requiresConfirmation`)

Do not add a second industry until retail is shipped, documented (in
`docs/verticals/retail.md`), and has runtime + lint test coverage.
Ship one vertical before adding more — verticals after retail (travel,
restaurants, banking, insurance, healthcare-admin, saas, support,
real-estate, logistics, government, jobs, events, education) each get
their own design/author/document/test cycle, repeating the same
process retail went through.

## Contribution model

Plain GitHub PR against `packages/schemas`, reviewed against a written
rubric in `CONTRIBUTING.md`:

- Follows the `verb_noun` snake_case convention; no new verb without
  discussion.
- Ships both `.schema.json` and `.example.json`.
- `additionalProperties: false` unless there's a stated reason not to.
- No overlap with an existing tool's name or purpose.

No RFC-before-PR process yet — the project is too young for that
overhead to pay for itself. Introduce it only if PR churn from
duplicate/conflicting proposals becomes a real problem.

## Linter behavior

`webmcp-lint` (in `packages/lint`) has two modes:

```bash
webmcp-lint static <glob>    # scans source for registerTool calls, no browser
webmcp-lint live <url>       # Playwright + the polyfill, reads document.modelContext.getTools()
```

Both modes check the same things against the canonical registry: a
tool name that duplicates a canonical concept under a non-canonical
name, missing descriptions, missing `readOnlyHint`, untyped object
blobs in a schema, and descriptions under 20 characters. Output is
human-readable by default, `--format json` for CI. Non-zero exit only
on error-level findings, so CI can gate on drift without blocking
legitimate custom tools. A GitHub Action wrapper lives in
`.github/actions/webmcp-lint`.

## Runtime package — the whole public API

```ts
import { registerCanonical } from '@webmcp-schemas/runtime';

const unregister = registerCanonical('retail.search_products', async (args, { signal }) => {
  return await mySearchFunction(args.query, args.category, args.maxPrice);
});
```

Three functions, no more:

- **`registerCanonical(id, handler, options?)`** — looks up the
  canonical schema by `id`, validates arguments against its
  `inputSchema` before invoking `handler`, registers it via
  `document.modelContext.registerTool(tool, { signal })`, and returns
  an `unregister` function that aborts that same signal — this is the
  real `@mcp-b/webmcp-polyfill`/WebMCP mechanism (tool lifetime is
  owned by the signal passed to `registerTool`; there's no separate
  `unregisterTool()`). Feature-detects `document.modelContext`
  (falling back to the deprecated `navigator.modelContext`) and
  no-ops with a single `console.warn` if neither exists — this
  package must never throw just because a browser doesn't support
  WebMCP yet, since sites will ship it broadly. If the schema's
  `requiresConfirmation` is set, the handler only resolves after a
  caller-supplied `confirm` callback returns `true`; the default
  `confirm` throws rather than silently auto-approving.

  **Correction, verified against the published `@mcp-b/webmcp-polyfill@5.0.1`
  types:** the real `execute` the polyfill calls takes a single
  `(input)` argument — there's no per-call `{ signal }` context. The
  `{ signal }` handlers receive above is `registerCanonical`'s own
  registration-lifetime `AbortController`, threaded through as the
  second argument for convenience (it becomes aborted when
  `unregister()` runs). It is not a per-call agent-cancellation
  signal — the real API has no such thing today.

- **`registerPack(vertical, handlers)`** — bulk `registerCanonical`
  over every tool in a vertical; throws on an unknown id.
- **`extendCanonical(id, { inputSchema })`** — additive-only extension
  of a canonical schema; rejects any change that removes or retypes a
  canonical field.

If you're about to add a fourth exported function, stop and check it
actually belongs in this package rather than in `lint` or `schemas`.
