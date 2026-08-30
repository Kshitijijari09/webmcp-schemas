import type { FromSchema } from 'json-schema-to-ts';
import type { ById } from './types.js';
// Generated mirrors (see scripts/generate-ts-mirrors.mjs and ADR 0001) —
// not the raw JSON files. A plain JSON import widens string/number
// properties, which breaks the FromSchema-based type derivation below.
import searchProducts from './generated/retail/search_products.js';
import applyFilters from './generated/retail/apply_filters.js';
import checkStock from './generated/retail/check_stock.js';
import addToCart from './generated/retail/add_to_cart.js';
import applyPromoCode from './generated/retail/apply_promo_code.js';
import getOrderStatus from './generated/retail/get_order_status.js';
import startReturn from './generated/retail/start_return.js';

/** The retail vertical, keyed by bare tool name. */
export const retail = {
  search_products: searchProducts,
  apply_filters: applyFilters,
  check_stock: checkStock,
  add_to_cart: addToCart,
  apply_promo_code: applyPromoCode,
  get_order_status: getOrderStatus,
  start_return: startReturn,
} as const;

const allTools = [
  searchProducts,
  applyFilters,
  checkStock,
  addToCart,
  applyPromoCode,
  getOrderStatus,
  startReturn,
] as const;

/** Every canonical tool across every vertical, keyed by its namespaced id. */
export type CanonicalToolMap = ById<typeof allTools>;
export type CanonicalToolId = keyof CanonicalToolMap;

export const CANONICAL_TOOLS = Object.fromEntries(
  allTools.map((tool) => [tool.id, tool]),
) as CanonicalToolMap;

// Pre-resolved input/output types, computed once per tool against a
// concrete (non-generic) schema. A generic `InputOf<Id>` that re-ran
// FromSchema against `CanonicalToolMap[Id]['inputSchema']` for an
// unresolved Id hit a real `tsc` "type instantiation is excessively deep"
// wall once enough tools/keywords were involved — verified empirically.
// This table exists so downstream packages only ever do a plain property
// lookup, never a fresh FromSchema evaluation. See ADR 0001.
export interface ResolvedIO {
  'retail.search_products': {
    input: FromSchema<typeof searchProducts.inputSchema>;
    output: FromSchema<typeof searchProducts.outputSchema>;
  };
  'retail.apply_filters': {
    input: FromSchema<typeof applyFilters.inputSchema>;
    output: FromSchema<typeof applyFilters.outputSchema>;
  };
  'retail.check_stock': {
    input: FromSchema<typeof checkStock.inputSchema>;
    output: FromSchema<typeof checkStock.outputSchema>;
  };
  'retail.add_to_cart': {
    input: FromSchema<typeof addToCart.inputSchema>;
    output: FromSchema<typeof addToCart.outputSchema>;
  };
  'retail.apply_promo_code': {
    input: FromSchema<typeof applyPromoCode.inputSchema>;
    output: FromSchema<typeof applyPromoCode.outputSchema>;
  };
  'retail.get_order_status': {
    input: FromSchema<typeof getOrderStatus.inputSchema>;
    output: FromSchema<typeof getOrderStatus.outputSchema>;
  };
  'retail.start_return': {
    input: FromSchema<typeof startReturn.inputSchema>;
    output: FromSchema<typeof startReturn.outputSchema>;
  };
}

// Compile-time guard: fails to typecheck if ResolvedIO's keys and
// CanonicalToolId ever diverge (e.g. a new tool added to allTools without
// a matching ResolvedIO entry).
type AssertSameKeys<A extends string, B extends string> = [A] extends [B]
  ? [B] extends [A]
    ? true
    : never
  : never;
const _resolvedIoKeysMatchCanonicalToolId: AssertSameKeys<CanonicalToolId, keyof ResolvedIO> = true;
void _resolvedIoKeysMatchCanonicalToolId;

export type InputOf<Id extends CanonicalToolId> = ResolvedIO[Id]['input'];
export type OutputOf<Id extends CanonicalToolId> = ResolvedIO[Id]['output'];
