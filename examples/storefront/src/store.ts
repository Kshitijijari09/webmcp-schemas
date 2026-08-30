export interface CartLineItem {
  lineItemId: string;
  productId: string;
  quantity: number;
}

export interface OrderLookupResult {
  orderId: string;
  status: string;
  trackingNumber?: string;
  canReturn: boolean;
}

export interface ReturnResult {
  returnId: string;
  status: string;
}

export interface StoreState {
  cartId: string;
  items: CartLineItem[];
  discountRate: number;
  visibleProductIds: string[];
  returns: { returnId: string; orderId: string; status: string }[];
  // Read at render time rather than mutated on a DOM node after the fact:
  // any tool call can trigger notifyStoreChange() and rebuild the panels
  // mid-await, so a post-hoc `element.textContent = ...` can end up
  // writing to an already-detached node. See handlers.ts / ui.ts.
  promoMessage?: string;
  orderLookup?: OrderLookupResult;
  returnResult?: ReturnResult;
}

export const store: StoreState = {
  cartId: 'cart_demo',
  items: [],
  discountRate: 0,
  visibleProductIds: [],
  returns: [],
};

let lineItemCounter = 0;
export function nextLineItemId(): string {
  lineItemCounter += 1;
  return `li_${lineItemCounter}`;
}

let returnCounter = 0;
export function nextReturnId(): string {
  returnCounter += 1;
  return `ret_${returnCounter}`;
}

type Listener = () => void;
const listeners: Listener[] = [];

export function onStoreChange(listener: Listener): void {
  listeners.push(listener);
}

export function notifyStoreChange(): void {
  for (const listener of listeners) listener();
}
