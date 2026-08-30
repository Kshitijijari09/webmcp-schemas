import type { InputOf, OutputOf } from '@webmcp-schemas/schemas';
import { PRODUCTS, PROMO_CODES, ORDERS, type Product } from './data.js';
import { store, nextLineItemId, nextReturnId, notifyStoreChange } from './store.js';
import { logToolCall } from './log.js';

function toSearchResult(product: Product) {
  return {
    productId: product.productId,
    name: product.name,
    price: product.price,
    currency: product.currency,
    inStock: product.inStock,
  };
}

function cartTotal(): { amount: number; currency: string } {
  const subtotal = store.items.reduce((sum, item) => {
    const product = PRODUCTS.find((p) => p.productId === item.productId);
    return sum + (product ? product.price * item.quantity : 0);
  }, 0);
  const total = Math.round(subtotal * (1 - store.discountRate) * 100) / 100;
  return { amount: total, currency: 'USD' };
}

type SearchProductsIn = InputOf<'retail.search_products'>;
type SearchProductsOut = OutputOf<'retail.search_products'>;
type ApplyFiltersIn = InputOf<'retail.apply_filters'>;
type ApplyFiltersOut = OutputOf<'retail.apply_filters'>;
type CheckStockIn = InputOf<'retail.check_stock'>;
type CheckStockOut = OutputOf<'retail.check_stock'>;
type AddToCartIn = InputOf<'retail.add_to_cart'>;
type AddToCartOut = OutputOf<'retail.add_to_cart'>;
type ApplyPromoCodeIn = InputOf<'retail.apply_promo_code'>;
type ApplyPromoCodeOut = OutputOf<'retail.apply_promo_code'>;
type GetOrderStatusIn = InputOf<'retail.get_order_status'>;
type GetOrderStatusOut = OutputOf<'retail.get_order_status'>;
type StartReturnIn = InputOf<'retail.start_return'>;
type StartReturnOut = OutputOf<'retail.start_return'>;

export async function searchProducts(args: SearchProductsIn): Promise<SearchProductsOut> {
  const query = args.query.toLowerCase();
  let results = PRODUCTS.filter(
    (p) => p.name.toLowerCase().includes(query) || p.category.toLowerCase().includes(query),
  );
  if (args.category) results = results.filter((p) => p.category === args.category);
  if (args.minPrice !== undefined) results = results.filter((p) => p.price >= args.minPrice!);
  if (args.maxPrice !== undefined) results = results.filter((p) => p.price <= args.maxPrice!);
  if (args.sortBy === 'price_asc') results = [...results].sort((a, b) => a.price - b.price);
  if (args.sortBy === 'price_desc') results = [...results].sort((a, b) => b.price - a.price);
  if (args.sortBy === 'rating') results = [...results].sort((a, b) => b.rating - a.rating);

  store.visibleProductIds = results.map((p) => p.productId);
  const output: SearchProductsOut = {
    totalCount: results.length,
    results: results.map(toSearchResult),
  };
  logToolCall('search_products', args, output);
  notifyStoreChange();
  return output;
}

export async function applyFilters(args: ApplyFiltersIn): Promise<ApplyFiltersOut> {
  const base =
    store.visibleProductIds.length > 0
      ? PRODUCTS.filter((p) => store.visibleProductIds.includes(p.productId))
      : PRODUCTS;
  let results = base;
  if (args.category) results = results.filter((p) => p.category === args.category);
  if (args.brand) results = results.filter((p) => p.brand === args.brand);
  if (args.minPrice !== undefined) results = results.filter((p) => p.price >= args.minPrice!);
  if (args.maxPrice !== undefined) results = results.filter((p) => p.price <= args.maxPrice!);
  if (args.minRating !== undefined) results = results.filter((p) => p.rating >= args.minRating!);
  if (args.inStockOnly) results = results.filter((p) => p.inStock);

  store.visibleProductIds = results.map((p) => p.productId);
  const output: ApplyFiltersOut = {
    totalCount: results.length,
    results: results.map(toSearchResult),
  };
  logToolCall('apply_filters', args, output);
  notifyStoreChange();
  return output;
}

export async function checkStock(args: CheckStockIn): Promise<CheckStockOut> {
  const product = PRODUCTS.find((p) => p.productId === args.productId);
  const output: CheckStockOut = product
    ? {
        productId: product.productId,
        inStock: product.inStock,
        availableQuantity: product.availableQuantity,
      }
    : { productId: args.productId, inStock: false, availableQuantity: 0 };
  logToolCall('check_stock', args, output);
  return output;
}

export async function addToCart(args: AddToCartIn): Promise<AddToCartOut> {
  const lineItemId = nextLineItemId();
  store.items.push({ lineItemId, productId: args.productId, quantity: args.quantity });
  const output: AddToCartOut = {
    cartId: store.cartId,
    lineItemId,
    quantity: args.quantity,
    cartTotal: cartTotal(),
  };
  logToolCall('add_to_cart', args, output);
  notifyStoreChange();
  return output;
}

export async function applyPromoCode(args: ApplyPromoCodeIn): Promise<ApplyPromoCodeOut> {
  const rate = PROMO_CODES[args.code];
  let output: ApplyPromoCodeOut;
  if (rate) {
    store.discountRate = rate;
    const before = cartTotal();
    output = {
      cartId: store.cartId,
      applied: true,
      discountAmount: { amount: Math.round(before.amount * rate * 100) / 100, currency: 'USD' },
      message: `${Math.round(rate * 100)}% off applied.`,
    };
  } else {
    output = {
      cartId: store.cartId,
      applied: false,
      message: `Unknown promo code "${args.code}".`,
    };
  }
  store.promoMessage = output.message;
  logToolCall('apply_promo_code', args, output);
  notifyStoreChange();
  return output;
}

export async function getOrderStatus(args: GetOrderStatusIn): Promise<GetOrderStatusOut> {
  const order = ORDERS.find((o) => o.orderId === args.orderId);
  const output: GetOrderStatusOut = order
    ? {
        orderId: order.orderId,
        status: order.status,
        estimatedDelivery: order.estimatedDelivery,
        trackingNumber: order.trackingNumber,
        trackingUrl: order.trackingUrl,
      }
    : { orderId: args.orderId, status: 'cancelled' };
  store.orderLookup = {
    orderId: output.orderId,
    status: output.status,
    trackingNumber: output.trackingNumber,
    canReturn: output.status === 'shipped' || output.status === 'delivered',
  };
  store.returnResult = undefined;
  logToolCall('get_order_status', args, output);
  notifyStoreChange();
  return output;
}

export async function startReturn(args: StartReturnIn): Promise<StartReturnOut> {
  const returnId = nextReturnId();
  const order = ORDERS.find((o) => o.orderId === args.orderId);
  const refundAmount = args.items.reduce((sum, item) => {
    const product = PRODUCTS.find((p) => p.productId === item.productId);
    return sum + (product ? product.price * item.quantity : 0);
  }, 0);

  store.returns.push({ returnId, orderId: args.orderId, status: 'initiated' });
  if (order) order.status = 'returned';

  const output: StartReturnOut = {
    returnId,
    status: 'initiated',
    estimatedRefund: { amount: Math.round(refundAmount * 100) / 100, currency: 'USD' },
    returnLabelUrl: `https://example.com/returns/${returnId}/label`,
  };
  store.returnResult = { returnId: output.returnId, status: output.status };
  if (store.orderLookup?.orderId === args.orderId) {
    store.orderLookup = { ...store.orderLookup, status: 'returned', canReturn: false };
  }
  logToolCall('start_return', args, output);
  notifyStoreChange();
  return output;
}
