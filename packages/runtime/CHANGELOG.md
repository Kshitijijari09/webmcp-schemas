# @webmcp-schemas/runtime

## 0.1.0

### Minor Changes

- 918c6bd: Initial public release.

  - `@webmcp-schemas/schemas`: canonical JSON Schema registry, seeded with the retail vertical (`search_products`, `apply_filters`, `check_stock`, `add_to_cart`, `apply_promo_code`, `get_order_status`, `start_return`).
  - `@webmcp-schemas/runtime`: `registerCanonical`, `registerPack`, `extendCanonical` — registers canonical tools on top of `@mcp-b/webmcp-polyfill`.
  - `@webmcp-schemas/lint`: `webmcp-lint` CLI (static and live modes) for checking a site's registered tools against the canonical registry.

### Patch Changes

- Updated dependencies [918c6bd]
  - @webmcp-schemas/schemas@0.1.0
