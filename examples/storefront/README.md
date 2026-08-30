# storefront-demo

A small vanilla-TS + Vite storefront wiring every canonical retail
tool to real page behaviour (product grid, filters, cart, order
lookup), with an on-page log of each tool call. Loads
`@mcp-b/webmcp-polyfill` so it works outside Chrome.

```bash
pnpm --filter storefront-demo dev      # hot-reload dev server
pnpm --filter storefront-demo build    # production build to dist/
pnpm --filter storefront-demo preview  # serve the production build
```

Try searching for "trail" or "jacket", adding an item to the cart
(triggers the confirmation modal — that's `requiresConfirmation: true`
from the schema, not decoration), applying promo code `WELCOME10`, or
looking up order `order_1001` / `order_1002` and starting a return.
The **Tool call log** panel shows every one of those as a real
registered WebMCP tool call with its actual arguments.

Deployed via [`.github/workflows/pages.yml`](../../.github/workflows/pages.yml)
on every push to `master`.
