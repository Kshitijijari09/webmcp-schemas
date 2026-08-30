import { PRODUCTS } from './data.js';
import { store, onStoreChange } from './store.js';
import { logEntries, onLogEntry, type LogEntry } from './log.js';
import { confirmAction } from './confirm.js';
import * as handlers from './handlers.js';

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<HTMLElementTagNameMap[K]> & { className?: string } = {},
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  Object.assign(node, props);
  for (const child of children) node.append(child);
  return node;
}

function visibleProducts() {
  if (store.visibleProductIds.length === 0) return PRODUCTS;
  return PRODUCTS.filter((p) => store.visibleProductIds.includes(p.productId));
}

async function handleAddToCart(productId: string) {
  const product = PRODUCTS.find((p) => p.productId === productId);
  if (!product) return;
  const confirmed = await confirmAction(`Add "${product.name}" to your cart?`);
  if (!confirmed) return;
  await handlers.addToCart({ productId, quantity: 1 });
}

function renderSearchBar(): HTMLElement {
  const input = el('input', {
    type: 'search',
    placeholder: 'Search products…',
    className: 'search-input',
  });
  const categorySelect = el('select', { className: 'search-select' }, [
    el('option', { value: '' }, ['All categories']),
    el('option', { value: 'footwear' }, ['Footwear']),
    el('option', { value: 'apparel' }, ['Apparel']),
  ]);
  const sortSelect = el('select', { className: 'search-select' }, [
    el('option', { value: 'relevance' }, ['Relevance']),
    el('option', { value: 'price_asc' }, ['Price: low to high']),
    el('option', { value: 'price_desc' }, ['Price: high to low']),
    el('option', { value: 'rating' }, ['Rating']),
  ]);
  const button = el('button', { className: 'primary-button', type: 'button' }, ['Search']);

  button.addEventListener('click', () => {
    const query = input.value.trim() || 'a';
    void handlers.searchProducts({
      query,
      category: categorySelect.value || undefined,
      sortBy: sortSelect.value as never,
    });
  });
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') button.click();
  });

  return el('div', { className: 'search-bar' }, [input, categorySelect, sortSelect, button]);
}

function renderFilters(): HTMLElement {
  const minRating = el('select', { className: 'search-select' }, [
    el('option', { value: '' }, ['Any rating']),
    el('option', { value: '4' }, ['4+ stars']),
    el('option', { value: '4.5' }, ['4.5+ stars']),
  ]);
  const inStockOnly = el('input', { type: 'checkbox', id: 'in-stock-only' });
  const label = el('label', { htmlFor: 'in-stock-only' }, [inStockOnly, ' In stock only']);
  const button = el('button', { className: 'secondary-button', type: 'button' }, ['Apply filters']);

  button.addEventListener('click', () => {
    void handlers.applyFilters({
      minRating: minRating.value ? Number(minRating.value) : undefined,
      inStockOnly: inStockOnly.checked || undefined,
    });
  });

  return el('div', { className: 'filters' }, [minRating, label, button]);
}

function renderProductCard(product: (typeof PRODUCTS)[number]): HTMLElement {
  const stockLabel = product.inStock ? `In stock (${product.availableQuantity})` : 'Out of stock';
  const checkStockButton = el('button', { className: 'link-button', type: 'button' }, [
    'Check stock',
  ]);
  const stockStatus = el('span', { className: 'stock-status' }, [stockLabel]);

  checkStockButton.addEventListener('click', async () => {
    const result = await handlers.checkStock({ productId: product.productId });
    stockStatus.textContent = result.inStock
      ? `In stock (${result.availableQuantity ?? '?'})`
      : 'Out of stock';
  });

  const addButton = el('button', { className: 'primary-button', type: 'button' }, ['Add to cart']);
  addButton.disabled = !product.inStock;
  addButton.addEventListener('click', () => void handleAddToCart(product.productId));

  return el('article', { className: 'product-card' }, [
    el('h3', {}, [product.name]),
    el('p', { className: 'product-meta' }, [`${product.brand} · ${product.category}`]),
    el('p', { className: 'product-price' }, [`$${product.price.toFixed(2)}`]),
    el('p', {}, [stockStatus, ' ', checkStockButton]),
    addButton,
  ]);
}

function renderProductGrid(): HTMLElement {
  return el(
    'div',
    { className: 'product-grid' },
    visibleProducts().map((product) => renderProductCard(product)),
  );
}

function renderCart(): HTMLElement {
  const items = store.items.map((item) => {
    const product = PRODUCTS.find((p) => p.productId === item.productId);
    return el('li', {}, [`${product?.name ?? item.productId} × ${item.quantity}`]);
  });

  const total = store.items.reduce((sum, item) => {
    const product = PRODUCTS.find((p) => p.productId === item.productId);
    return sum + (product ? product.price * item.quantity : 0);
  }, 0);
  const discounted = total * (1 - store.discountRate);

  const promoInput = el('input', {
    type: 'text',
    placeholder: 'Promo code',
    className: 'search-input',
  });
  const promoButton = el('button', { className: 'secondary-button', type: 'button' }, [
    'Apply promo code',
  ]);

  promoButton.addEventListener('click', async () => {
    const code = promoInput.value.trim();
    if (!code) return;
    const confirmed = await confirmAction(`Apply promo code "${code}" to your cart?`);
    if (!confirmed) return;
    await handlers.applyPromoCode({ cartId: store.cartId, code });
  });

  return el('section', { className: 'panel cart-panel' }, [
    el('h2', {}, ['Cart']),
    el('ul', {}, items.length ? items : [el('li', { className: 'muted' }, ['Cart is empty'])]),
    el('p', { className: 'cart-total' }, [`Total: $${discounted.toFixed(2)}`]),
    el('div', { className: 'promo-row' }, [promoInput, promoButton]),
    // Read directly from the store rather than mutated after the fact:
    // applyPromoCode's own notifyStoreChange() can rebuild this whole panel
    // (a fresh <p>) before the click handler above resumes, so writing to a
    // locally-held element reference here would write to a detached node.
    el('p', { className: 'promo-message' }, [store.promoMessage ?? '']),
  ]);
}

function renderOrderLookup(): HTMLElement {
  const orderInput = el('input', {
    type: 'text',
    placeholder: 'Order ID (try order_1001 or order_1002)',
    className: 'search-input',
    value: store.orderLookup?.orderId ?? '',
  });
  const lookupButton = el('button', { className: 'secondary-button', type: 'button' }, [
    'Look up order',
  ]);

  lookupButton.addEventListener('click', async () => {
    const orderId = orderInput.value.trim();
    if (!orderId) return;
    await handlers.getOrderStatus({ orderId });
  });

  const resultChildren: (Node | string)[] = [];
  const lookup = store.orderLookup;
  if (lookup) {
    resultChildren.push(el('p', {}, [`Status: ${lookup.status}`]));
    if (lookup.trackingNumber)
      resultChildren.push(el('p', {}, [`Tracking: ${lookup.trackingNumber}`]));

    if (lookup.canReturn) {
      const returnButton = el('button', { className: 'link-button', type: 'button' }, [
        'Start a return',
      ]);
      returnButton.addEventListener('click', async () => {
        const confirmed = await confirmAction(`Start a return for order "${lookup.orderId}"?`);
        if (!confirmed) return;
        await handlers.startReturn({
          orderId: lookup.orderId,
          items: [{ productId: 'sku_1', quantity: 1 }],
          reason: 'no_longer_needed',
        });
      });
      resultChildren.push(returnButton);
    }

    if (store.returnResult) {
      resultChildren.push(
        el('p', {}, [
          `Return started: ${store.returnResult.returnId} (${store.returnResult.status})`,
        ]),
      );
    }
  }

  return el('section', { className: 'panel' }, [
    el('h2', {}, ['Order status']),
    el('div', { className: 'promo-row' }, [orderInput, lookupButton]),
    el('div', { className: 'order-result' }, resultChildren),
  ]);
}

function renderLogEntry(entry: LogEntry): HTMLElement {
  return el('li', { className: 'log-entry' }, [
    el('span', { className: 'log-time' }, [entry.timestamp]),
    el('span', { className: 'log-tool' }, [entry.toolName]),
    el('pre', { className: 'log-args' }, [JSON.stringify(entry.args)]),
  ]);
}

function renderLogPanel(): HTMLElement {
  const list = el(
    'ul',
    { className: 'log-list' },
    logEntries.map((entry) => renderLogEntry(entry)),
  );
  onLogEntry((entry) => {
    list.append(renderLogEntry(entry));
    list.scrollTop = list.scrollHeight;
  });
  return el('section', { className: 'panel log-panel' }, [
    el('h2', {}, ['Tool call log']),
    el('p', { className: 'muted' }, [
      'Every retail tool call — from this UI or from an agent — appears here.',
    ]),
    list,
  ]);
}

export function renderApp(root: HTMLElement): void {
  // The log panel subscribes to onLogEntry once and is never torn down —
  // re-creating it on every store-driven re-render would leave a growing
  // trail of listeners bound to detached <ul> elements.
  const logPanel = renderLogPanel();
  let layout: HTMLElement;

  function render() {
    const cartAndOrder = el('div', {}, [renderCart(), renderOrderLookup()]);
    const nextLayout = el('div', { className: 'layout' }, [
      el('div', { className: 'main-column' }, [
        renderSearchBar(),
        renderFilters(),
        renderProductGrid(),
      ]),
      el('div', { className: 'side-column' }, [cartAndOrder, logPanel]),
    ]);

    if (layout) layout.replaceWith(nextLayout);
    else root.append(nextLayout);
    layout = nextLayout;
  }

  onStoreChange(render);
  root.append(
    el('header', { className: 'app-header' }, [
      el('h1', {}, ['webmcp-schemas storefront demo']),
      el('p', { className: 'muted' }, [
        'A vanilla-TS demo wiring the retail canonical tool pack to real page behaviour.',
      ]),
    ]),
  );
  render();
}
