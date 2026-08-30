import { afterEach, describe, expect, it, vi } from 'vitest';
import { getModelContext } from './model-context.js';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('getModelContext', () => {
  it('returns undefined and warns once when neither document nor navigator expose modelContext', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = getModelContext();

    expect(result).toBeUndefined();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toContain('document.modelContext');
  });

  it('returns document.modelContext when present, without warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const modelContext = { registerTool: vi.fn() };
    vi.stubGlobal('document', { modelContext });

    const result = getModelContext();

    expect(result).toBe(modelContext);
    expect(warn).not.toHaveBeenCalled();
  });

  it('falls back to navigator.modelContext with a deprecation warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const modelContext = { registerTool: vi.fn() };
    vi.stubGlobal('navigator', { modelContext });

    const result = getModelContext();

    expect(result).toBe(modelContext);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toContain('deprecated');
  });

  it('prefers document.modelContext over navigator.modelContext when both are present', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const documentModelContext = { registerTool: vi.fn() };
    const navigatorModelContext = { registerTool: vi.fn() };
    vi.stubGlobal('document', { modelContext: documentModelContext });
    vi.stubGlobal('navigator', { modelContext: navigatorModelContext });

    const result = getModelContext();

    expect(result).toBe(documentModelContext);
  });
});
