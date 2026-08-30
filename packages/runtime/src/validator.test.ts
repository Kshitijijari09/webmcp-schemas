import { describe, expect, it } from 'vitest';
import { validateArgs } from './validator.js';

describe('validateArgs', () => {
  const schema = {
    type: 'object',
    properties: {
      query: { type: 'string', minLength: 1 },
      quantity: { type: 'integer', minimum: 1, maximum: 10 },
      category: { type: 'string', enum: ['shoes', 'shirts'] },
      tags: { type: 'array', items: { type: 'string' }, minItems: 1 },
    },
    required: ['query'],
    additionalProperties: false,
  };

  it('accepts data satisfying the schema', () => {
    const result = validateArgs(schema, { query: 'shoes', quantity: 2 });
    expect(result).toEqual({ valid: true, errors: [] });
  });

  it('rejects data missing a required field', () => {
    const result = validateArgs(schema, { quantity: 2 });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('query'))).toBe(true);
  });

  it('rejects a field with the wrong type', () => {
    const result = validateArgs(schema, { query: 42 });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('query'))).toBe(true);
  });

  it('rejects an integer field given a non-integer number', () => {
    const result = validateArgs(schema, { query: 'x', quantity: 2.5 });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('quantity'))).toBe(true);
  });

  it('rejects a number outside its minimum/maximum bounds', () => {
    const result = validateArgs(schema, { query: 'x', quantity: 20 });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('quantity'))).toBe(true);
  });

  it('rejects a value not in an enum', () => {
    const result = validateArgs(schema, { query: 'x', category: 'hats' });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('category'))).toBe(true);
  });

  it('rejects an additional property when additionalProperties is false', () => {
    const result = validateArgs(schema, { query: 'x', extra: true });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('extra'))).toBe(true);
  });

  it('rejects an array with fewer than minItems entries', () => {
    const result = validateArgs(schema, { query: 'x', tags: [] });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('tags'))).toBe(true);
  });

  it('rejects an array item with the wrong type', () => {
    const result = validateArgs(schema, { query: 'x', tags: [1] });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('tags'))).toBe(true);
  });

  it('recurses into nested object properties', () => {
    const nestedSchema = {
      type: 'object',
      properties: {
        cart: {
          type: 'object',
          properties: { id: { type: 'string' } },
          required: ['id'],
          additionalProperties: false,
        },
      },
      required: ['cart'],
      additionalProperties: false,
    };

    const result = validateArgs(nestedSchema, { cart: {} });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('cart.id') || e.includes('cart'))).toBe(true);
  });
});
