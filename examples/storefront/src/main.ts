import { initializeWebMCPPolyfill } from '@mcp-b/webmcp-polyfill';
import { registerPack } from '@webmcp-schemas/runtime';
import { retail } from '@webmcp-schemas/schemas/retail';
import * as handlers from './handlers.js';
import { confirmAction } from './confirm.js';
import { renderApp } from './ui.js';
import './style.css';

// Loads document.modelContext when the browser doesn't provide it natively
// yet — this demo works outside Chrome's WebMCP origin trial.
initializeWebMCPPolyfill();

registerPack(
  retail,
  {
    search_products: handlers.searchProducts,
    apply_filters: handlers.applyFilters,
    check_stock: handlers.checkStock,
    add_to_cart: handlers.addToCart,
    apply_promo_code: handlers.applyPromoCode,
    get_order_status: handlers.getOrderStatus,
    start_return: handlers.startReturn,
  },
  {
    confirm: (args) =>
      confirmAction(`An agent wants to run this action: ${JSON.stringify(args)}. Allow it?`),
  },
);

const app = document.querySelector<HTMLDivElement>('#app');
if (app) {
  renderApp(app);
}
