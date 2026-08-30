# webmcp-schemas

> **Status: early / experimental.** [WebMCP](https://github.com/webmachinelearning/webmcp)
> itself is a Draft Community Group Report, live in a Chrome origin trial
> from Chrome 149 — its root registration object only recently moved from
> `navigator.modelContext` to `document.modelContext`, and the rest of the
> API can still change. This registry, and the packages built on it, will
> move with it. Nothing here is published to npm yet — see
> [Status](#status) below.

If one retailer registers a `search_products` tool, another registers
`productSearch`, and a third registers `find_items`, every AI agent has
to relearn every site's vocabulary from scratch — there's no shared
language for what a site's tools are called or shaped like.
`robots.txt` standardised where crawlers may go. schema.org
standardised what your page's things _are_. Nothing standardises what
your site can _do_ — until an agent calling one retailer's
`search_products` can reasonably expect every other retailer's
`search_products` to look the same.

**webmcp-schemas** is a community registry of canonical
[WebMCP](https://webmachinelearning.github.io/webmcp/) tool schemas,
organised by industry vertical, plus a tiny runtime to register them
and a linter to catch drift from them.

## Why this is useful

- **For sites implementing WebMCP:** don't invent your own shape for
  `search_products` or `get_order_status`. Register the canonical
  version and any agent that already knows the retail vocabulary
  understands your site immediately — no site-specific prompting or
  discovery step.
- **For agent builders:** one vocabulary to learn per industry instead
  of one per site. A canonical `retail.search_products` behaves the
  same way — same arguments, same output shape, same confirmation
  semantics — no matter which store registered it.
- **For the ecosystem:** the registry is the neutral, auditable
  middle ground. Schemas are plain JSON Schema, reviewed in the open
  via PR, versioned like any other package — not a single vendor's
  private convention.

## Quickstart

```ts
import { initializeWebMCPPolyfill } from '@mcp-b/webmcp-polyfill';
import { registerCanonical } from '@webmcp-schemas/runtime';

initializeWebMCPPolyfill();

registerCanonical('retail.search_products', async ({ query }) => {
  return await mySearchFunction(query);
});
```

That's the whole integration surface: look up a canonical tool by id,
supply the function that actually does the work. `registerCanonical`
validates the agent's arguments against the canonical schema before
your handler ever runs, wraps confirmation-required tools so they
can't silently auto-approve, and registers everything through
`document.modelContext` for you.

## This is not a polyfill

webmcp-schemas does not implement WebMCP itself. `initializeWebMCPPolyfill()`
above comes from [`@mcp-b/webmcp-polyfill`](https://www.npmjs.com/package/@mcp-b/webmcp-polyfill) —
a separate, existing project that provides `document.modelContext` in
browsers that don't have it natively yet. `@webmcp-schemas/runtime` is
a `peerDependency` on it, not a reimplementation of it. If you're
looking for the polyfill itself, or for React hooks
(`@mcp-b/react-webmcp`, `usewebmcp`), those already exist elsewhere —
this project is specifically the schema registry, the thin runtime
that registers from it, and the linter that checks against it.

## Packages

| Package                                       | What it is                                                                                                                                                            |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`@webmcp-schemas/schemas`](packages/schemas) | The canonical JSON Schema registry — data and generated types, no runtime logic, zero dependencies.                                                                   |
| [`@webmcp-schemas/runtime`](packages/runtime) | `registerCanonical`, `registerPack`, `extendCanonical` — registers canonical tools on top of the WebMCP polyfill. Zero third-party runtime dependencies.              |
| [`@webmcp-schemas/lint`](packages/lint)       | `webmcp-lint` — checks a site's registered tools against the canonical registry, statically or against a live page.                                                   |
| [`storefront-demo`](examples/storefront)      | A working vanilla-TS storefront with every retail tool wired to real page behaviour, including a live tool-call log. Run it with `pnpm --filter storefront-demo dev`. |

## Verticals

Only **retail** is shipped so far — seven tools (`search_products`,
`apply_filters`, `check_stock`, `add_to_cart`, `apply_promo_code`,
`get_order_status`, `start_return`), documented with a worked example
in [`docs/verticals/retail.md`](docs/verticals/retail.md).

More verticals (travel, restaurants, banking, insurance,
healthcare-admin, saas, support, real-estate, logistics, government,
jobs, events, education) are planned, one at a time — see
[`PLAN.md`](PLAN.md) and [`CLAUDE.md`](CLAUDE.md) for the roadmap and
the reasoning behind that pace.

## Contributing a schema

1. Open a PR adding `<tool_name>.json` and `<tool_name>.example.json`
   under `packages/schemas/src/schemas/<vertical>/` (an existing
   vertical, or a new one — see [`docs/adr/0001-schema-format.md`](docs/adr/0001-schema-format.md)
   for the exact file format).
2. Follow the naming convention: `verb_noun`, snake_case, verb from
   the existing controlled vocabulary (`search`, `get`, `add`,
   `remove`, `update`, `create`, `cancel`, `apply`, `check`, `start`) —
   propose a new verb in the PR description if none fits.
3. Write the `description` as guidance for an LLM choosing between
   tools — it must disambiguate your tool from its siblings in the
   same vertical, not just describe what it does.
4. Mark reads `readOnlyHint: true`; mark anything with a real-world
   side effect `requiresConfirmation: true`.
5. Run `pnpm --filter @webmcp-schemas/schemas test` — it validates
   every canonical file against the meta-schema and every example
   against its own schema.

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the full review rubric.

## Status

Nothing in this repo is published to npm yet. To try it, clone and
build locally:

```bash
git clone https://github.com/Kshitijijari09/webmcp-schemas.git
cd webmcp-schemas
pnpm install
pnpm build
pnpm test
```

Try the demo with `pnpm --filter storefront-demo dev`, or see it
already deployed at
[kshitijijari09.github.io/webmcp-schemas](https://kshitijijari09.github.io/webmcp-schemas/).

## License

[MIT](LICENSE)
