import { describe, expect, it } from 'vitest';
import { runChecks, type FoundTool } from './checks.js';

const canonicalTools = [
  {
    id: 'retail.search_products',
    name: 'search_products',
    title: 'Search products',
  },
  {
    id: 'retail.check_stock',
    name: 'check_stock',
    title: 'Check stock',
  },
];

function tool(overrides: Partial<FoundTool> = {}): FoundTool {
  return {
    name: 'do_something',
    description: 'A perfectly adequate description of what this tool does for an agent.',
    inputSchema: {
      type: 'object',
      properties: { query: { type: 'string' } },
    },
    annotations: { readOnlyHint: true },
    ...overrides,
  };
}

describe('runChecks', () => {
  it('reports no findings for a well-formed tool', () => {
    const findings = runChecks(tool(), canonicalTools);
    expect(findings).toEqual([]);
  });

  it('reports an error when description is missing', () => {
    const findings = runChecks(tool({ description: undefined }), canonicalTools);
    expect(findings.some((f) => f.rule === 'missing-description' && f.level === 'error')).toBe(
      true,
    );
  });

  it('reports a warning when description is shorter than 20 characters', () => {
    const findings = runChecks(tool({ description: 'too short' }), canonicalTools);
    expect(findings.some((f) => f.rule === 'short-description' && f.level === 'warning')).toBe(
      true,
    );
  });

  it('reports a warning when readOnlyHint is missing from annotations', () => {
    const findings = runChecks(tool({ annotations: {} }), canonicalTools);
    expect(findings.some((f) => f.rule === 'missing-readonly-hint' && f.level === 'warning')).toBe(
      true,
    );
  });

  it('reports a warning when annotations are missing entirely', () => {
    const findings = runChecks(tool({ annotations: undefined }), canonicalTools);
    expect(findings.some((f) => f.rule === 'missing-readonly-hint' && f.level === 'warning')).toBe(
      true,
    );
  });

  it('reports a warning for an untyped property in the input schema', () => {
    const findings = runChecks(
      tool({
        inputSchema: {
          type: 'object',
          properties: { query: { type: 'string' }, blob: {} },
        },
      }),
      canonicalTools,
    );
    const finding = findings.find((f) => f.rule === 'untyped-schema-property');
    expect(finding?.level).toBe('warning');
    expect(finding?.message).toContain('blob');
  });

  it('reports a warning when a non-canonical name likely duplicates a canonical concept', () => {
    const findings = runChecks(
      tool({ name: 'find_products', description: tool().description }),
      canonicalTools,
    );
    const finding = findings.find((f) => f.rule === 'possible-duplicate');
    expect(finding?.level).toBe('warning');
    expect(finding?.message).toContain('search_products');
  });

  it('does not flag a tool that already uses the canonical name', () => {
    const findings = runChecks(tool({ name: 'search_products' }), canonicalTools);
    expect(findings.some((f) => f.rule === 'possible-duplicate')).toBe(false);
  });
});
