import { describe, expect, it } from 'vitest';
import { validateCanonicalToolFile } from './validate.js';

function validTool(overrides: Record<string, unknown> = {}) {
  return {
    id: 'retail.search_products',
    name: 'search_products',
    title: 'Search products',
    description:
      'Search the catalog by free-text query and optional filters. Use this to find products by name/keyword.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
      },
      required: ['query'],
      additionalProperties: false,
    },
    outputSchema: {
      type: 'object',
      properties: {
        results: { type: 'array', items: { type: 'string' } },
      },
      required: ['results'],
      additionalProperties: false,
    },
    annotations: {
      readOnlyHint: true,
      untrustedContentHint: false,
      requiresConfirmation: false,
    },
    stability: 'draft',
    version: '0.1.0',
    ...overrides,
  };
}

describe('validateCanonicalToolFile', () => {
  it('accepts a well-formed canonical tool file', () => {
    const result = validateCanonicalToolFile(validTool());

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('rejects a file missing the id field', () => {
    const tool = validTool();
    delete (tool as Record<string, unknown>).id;

    const result = validateCanonicalToolFile(tool);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('id'))).toBe(true);
  });

  it('rejects a file whose id tail does not match name', () => {
    const result = validateCanonicalToolFile(
      validTool({ id: 'retail.search_products', name: 'find_products' }),
    );

    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.toLowerCase().includes('id') && e.toLowerCase().includes('name')),
    ).toBe(true);
  });

  it('rejects an inputSchema that is not valid JSON Schema 2020-12', () => {
    const result = validateCanonicalToolFile(
      validTool({ inputSchema: { type: 'not-a-real-json-schema-type' } }),
    );

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.toLowerCase().includes('inputschema'))).toBe(true);
  });

  it('rejects an unknown stability value', () => {
    const result = validateCanonicalToolFile(validTool({ stability: 'beta' }));

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.toLowerCase().includes('stability'))).toBe(true);
  });

  it('rejects a file missing description', () => {
    const tool = validTool();
    delete (tool as Record<string, unknown>).description;

    const result = validateCanonicalToolFile(tool);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('description'))).toBe(true);
  });
});
