import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { retail } from '@webmcp-schemas/schemas/retail';
import type { registerPack as RegisterPack } from './register-pack.js';

let registerPack: typeof RegisterPack;

beforeEach(async () => {
  vi.resetModules();
  ({ registerPack } = await import('./register-pack.js'));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function setupModelContext() {
  const registerTool = vi.fn();
  vi.stubGlobal('document', { modelContext: { registerTool } });
  return registerTool;
}

describe('registerPack', () => {
  it('registers every provided handler as its corresponding canonical tool', () => {
    const registerTool = setupModelContext();

    registerPack(retail, {
      search_products: async () => ({ totalCount: 0, results: [] }),
      check_stock: async () => ({ productId: 'sku_1', inStock: true }),
    });

    const registeredNames = registerTool.mock.calls.map(
      (call) => (call[0] as { name: string }).name,
    );
    expect(registeredNames.sort()).toEqual(['check_stock', 'search_products']);
  });

  it('throws on an unknown tool key and registers nothing from that call', () => {
    const registerTool = setupModelContext();

    expect(() =>
      registerPack(retail, {
        search_products: async () => ({ totalCount: 0, results: [] }),
        not_a_real_tool: async () => ({}),
      } as never),
    ).toThrow(/unknown/i);

    expect(registerTool).not.toHaveBeenCalled();
  });

  it('unregisters every handler it registered when the returned function is called', () => {
    setupModelContext();

    const unregister = registerPack(retail, {
      search_products: async () => ({ totalCount: 0, results: [] }),
      check_stock: async () => ({ productId: 'sku_1', inStock: true }),
    });

    expect(() => unregister()).not.toThrow();

    // Re-registering the same pack after unregister must succeed, proving
    // both tools were actually released (registerCanonical would otherwise
    // throw "already registered").
    expect(() =>
      registerPack(retail, {
        search_products: async () => ({ totalCount: 0, results: [] }),
        check_stock: async () => ({ productId: 'sku_1', inStock: true }),
      }),
    ).not.toThrow();
  });
});
