import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { registerCanonical as RegisterCanonical } from './register-canonical.js';

// register-canonical.ts keeps module-level state (which ids are currently
// registered) so double-registration can be guarded against. Re-import it
// fresh for every test so that state doesn't leak between unrelated tests.
let registerCanonical: typeof RegisterCanonical;

beforeEach(async () => {
  vi.resetModules();
  ({ registerCanonical } = await import('./register-canonical.js'));
});

function setupModelContext() {
  const registerTool = vi.fn();
  vi.stubGlobal('document', { modelContext: { registerTool } });
  return registerTool;
}

function registeredExecute(registerTool: ReturnType<typeof vi.fn>) {
  const call = registerTool.mock.calls[0]?.[0] as { execute: (...args: unknown[]) => unknown };
  return call.execute;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('registerCanonical', () => {
  it('registers the canonical tool name, description, and inputSchema', () => {
    const registerTool = setupModelContext();
    registerCanonical('retail.search_products', async () => ({ totalCount: 0, results: [] }));

    expect(registerTool).toHaveBeenCalledTimes(1);
    const tool = registerTool.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(tool.name).toBe('search_products');
    expect(typeof tool.description).toBe('string');
    expect(tool.inputSchema).toMatchObject({ type: 'object', required: ['query'] });
  });

  it('invokes the handler and returns its result when arguments are valid', async () => {
    const registerTool = setupModelContext();
    const handler = vi.fn().mockResolvedValue({ totalCount: 1, results: [] });
    registerCanonical('retail.search_products', handler);

    const result = await registeredExecute(registerTool)({ query: 'shoes' });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ totalCount: 1, results: [] });
  });

  it('returns a structured error and skips the handler when arguments fail validation', async () => {
    const registerTool = setupModelContext();
    const handler = vi.fn();
    registerCanonical('retail.search_products', handler);

    const result = (await registeredExecute(registerTool)({})) as { error: { type: string } };

    expect(handler).not.toHaveBeenCalled();
    expect(result.error.type).toBe('validation_failed');
  });

  it('throws the default confirm error for a requiresConfirmation tool when no confirm option is given', async () => {
    const registerTool = setupModelContext();
    const handler = vi.fn();
    registerCanonical('retail.add_to_cart', handler);

    await expect(
      registeredExecute(registerTool)({ productId: 'sku_1', quantity: 1 }),
    ).rejects.toThrow(/confirm/i);
    expect(handler).not.toHaveBeenCalled();
  });

  it('invokes the handler when the supplied confirm callback returns true', async () => {
    const registerTool = setupModelContext();
    const handler = vi.fn().mockResolvedValue({
      cartId: 'c1',
      lineItemId: 'li1',
      quantity: 1,
      cartTotal: { amount: 1, currency: 'USD' },
    });
    registerCanonical('retail.add_to_cart', handler, { confirm: async () => true });

    const result = await registeredExecute(registerTool)({ productId: 'sku_1', quantity: 1 });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ cartId: 'c1' });
  });

  it('skips the handler and returns a structured decline when confirm returns false', async () => {
    const registerTool = setupModelContext();
    const handler = vi.fn();
    registerCanonical('retail.add_to_cart', handler, { confirm: async () => false });

    const result = (await registeredExecute(registerTool)({
      productId: 'sku_1',
      quantity: 1,
    })) as { error: { type: string } };

    expect(handler).not.toHaveBeenCalled();
    expect(result.error.type).toBe('confirmation_declined');
  });

  it("passes execute's AbortSignal through to the handler", async () => {
    const registerTool = setupModelContext();
    let receivedSignal: AbortSignal | undefined;
    const handler = vi.fn().mockImplementation((_args, ctx: { signal: AbortSignal }) => {
      receivedSignal = ctx.signal;
      return { totalCount: 0, results: [] };
    });
    registerCanonical('retail.search_products', handler);

    const controller = new AbortController();
    await registeredExecute(registerTool)({ query: 'shoes' }, { signal: controller.signal });

    expect(receivedSignal).toBe(controller.signal);
  });

  it("passes an AbortSignal to registerTool's options, and unregister() aborts it", () => {
    const registerTool = setupModelContext();
    const unregister = registerCanonical('retail.search_products', vi.fn());

    const options = registerTool.mock.calls[0]?.[1] as { signal?: AbortSignal };
    expect(options?.signal).toBeInstanceOf(AbortSignal);
    expect(options?.signal?.aborted).toBe(false);

    unregister();

    expect(options?.signal?.aborted).toBe(true);
  });

  it('throws immediately for an unknown canonical id', () => {
    setupModelContext();
    expect(() => registerCanonical('retail.not_a_real_tool' as never, vi.fn())).toThrow(/unknown/i);
  });

  it('warns and no-ops instead of throwing when document.modelContext is unavailable', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(() => registerCanonical('retail.search_products', vi.fn())).not.toThrow();
    expect(warn).toHaveBeenCalled();
  });

  it('throws on double registration, and allows re-registering after unregister', () => {
    const registerTool = setupModelContext();
    const unregister = registerCanonical('retail.search_products', vi.fn());

    expect(() => registerCanonical('retail.search_products', vi.fn())).toThrow(
      /already registered/i,
    );

    unregister();

    expect(() => registerCanonical('retail.search_products', vi.fn())).not.toThrow();
    expect(registerTool).toHaveBeenCalledTimes(2);
  });
});
