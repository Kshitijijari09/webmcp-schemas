import { describe, expect, it } from 'vitest';
import { extendCanonical } from './extend-canonical.js';

describe('extendCanonical', () => {
  it('merges a new optional property into the canonical inputSchema', () => {
    const result = extendCanonical('retail.search_products', {
      inputSchema: { properties: { brandId: { type: 'string' } } },
    });

    const schema = result.inputSchema as {
      properties: Record<string, unknown>;
      required: string[];
    };
    expect(schema.properties.brandId).toEqual({ type: 'string' });
    // Canonical properties survive untouched.
    expect(schema.properties.query).toEqual({ type: 'string', minLength: 1 });
    expect(schema.required).toEqual(['query']);
  });

  it('adds new required fields from the extension to the merged required list', () => {
    const result = extendCanonical('retail.search_products', {
      inputSchema: {
        properties: { brandId: { type: 'string' } },
        required: ['brandId'],
      },
    });

    const schema = result.inputSchema as { required: string[] };
    expect(schema.required.sort()).toEqual(['brandId', 'query']);
  });

  it('throws when the extension retypes an existing canonical property', () => {
    expect(() =>
      extendCanonical('retail.search_products', {
        inputSchema: { properties: { query: { type: 'number' } } },
      }),
    ).toThrow(/retype|query/i);
  });

  it('throws immediately for an unknown canonical id', () => {
    expect(() => extendCanonical('retail.not_a_real_tool' as never, { inputSchema: {} })).toThrow(
      /unknown/i,
    );
  });
});
