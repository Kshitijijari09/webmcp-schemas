# Retail

The seed vertical — see `PLAN.md` Stage 3 and `CLAUDE.md`. Seven
tools: three reads that narrow toward a specific product or order,
three confirmed writes that change cart/order state, and one status
read. Canonical files live in
`packages/schemas/src/schemas/retail/`.

## Tools

### `search_products` (read)

Free-text catalog search with optional price/category filters and
sorting. The entry point when the caller doesn't yet have a
`productId`.

- **Disambiguation:** use `apply_filters` instead if you just need to
  narrow the current results without changing the search term; use
  `check_stock` instead once you already have a specific `productId`.
- **Input:** `query` (required), `category`, `minPrice`, `maxPrice`,
  `sortBy` (`relevance | price_asc | price_desc | rating`)
- **Output:** `totalCount`, `results[]` (`productId`, `name`, `price`,
  `currency`, `inStock`)

### `apply_filters` (read)

Refine the current listing with structured facets — no free-text
query.

- **Disambiguation:** use `search_products` instead if the user wants
  a different search term, not just narrower results.
- **Input:** `category`, `brand`, `minPrice`, `maxPrice`, `minRating`,
  `inStockOnly` — all optional
- **Output:** same shape as `search_products`

### `check_stock` (read)

Real-time availability for one already-identified product.

- **Disambiguation:** requires a `productId` you already have — use
  `search_products` or `apply_filters` first if you don't. Never
  returns other products, unlike `search_products`.
- **Input:** `productId` (required), `quantity`, `postalCode`
- **Output:** `productId`, `inStock`, `availableQuantity`,
  `estimatedRestockDate`

### `add_to_cart` (write, requires confirmation)

Adds a specific product/quantity to the cart.

- **Disambiguation:** run `check_stock` first if availability at the
  requested quantity is uncertain; follow with `apply_promo_code` to
  discount the resulting cart.
- **Input:** `productId` (required), `quantity` (required, ≥ 1)
- **Output:** `cartId`, `lineItemId`, `quantity`, `cartTotal`
  (`amount`, `currency`)

### `apply_promo_code` (write, requires confirmation)

Applies a discount code to an existing cart.

- **Disambiguation:** distinct from `add_to_cart` (adds items) and
  `start_return` (returns already-ordered items) — this only ever
  discounts an existing cart.
- **Input:** `cartId` (required), `code` (required)
- **Output:** `cartId`, `applied`, `discountAmount`, `message`

### `get_order_status` (read)

Looks up a placed order's status. Read-only.

- **Disambiguation:** use `start_return` instead if the user wants to
  return items from a delivered order rather than just check where it
  is.
- **Input:** `orderId` (required)
- **Output:** `orderId`, `status`
  (`pending | processing | shipped | delivered | cancelled | returned`),
  `estimatedDelivery`, `trackingNumber`, `trackingUrl`

### `start_return` (write, requires confirmation)

Begins a return for one or more items from a placed order.

- **Disambiguation:** run `get_order_status` first to confirm the
  order and which items it contains.
- **Input:** `orderId` (required), `items[]` (required, ≥ 1 item —
  `productId`, `quantity`), `reason` (required,
  `defective | wrong_item | no_longer_needed | better_price_found | other`)
- **Output:** `returnId`, `status`
  (`initiated | awaiting_dropoff | received | refunded`),
  `estimatedRefund`, `returnLabelUrl`

## Worked example

A shopper asks an agent: _"Find me running shoes under $120, add the
cheapest one to my cart, and apply the WELCOME10 code."_

```
1. search_products({ query: "running shoes", maxPrice: 120, sortBy: "price_asc" })
   → { totalCount: 2, results: [{ productId: "sku_10231", price: 89.99, inStock: true, ... }, ...] }

2. check_stock({ productId: "sku_10231", quantity: 1 })
   → { productId: "sku_10231", inStock: true, availableQuantity: 12 }

3. add_to_cart({ productId: "sku_10231", quantity: 1 })   // requires confirmation
   → { cartId: "cart_88f2", lineItemId: "li_001", quantity: 1, cartTotal: { amount: 89.99, currency: "USD" } }

4. apply_promo_code({ cartId: "cart_88f2", code: "WELCOME10" })   // requires confirmation
   → { cartId: "cart_88f2", applied: true, discountAmount: { amount: 9.00, currency: "USD" }, message: "10% off applied." }
```

Steps 3 and 4 both carry `annotations.requiresConfirmation: true` —
`@webmcp-schemas/runtime`'s `registerCanonical` wraps their handlers
so they only execute once the site's confirmation callback returns
`true` for that specific call.
