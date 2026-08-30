import { describe, expect, it } from 'vitest';
import { scanSourceForTools } from './static-scan.js';

describe('scanSourceForTools', () => {
  it('finds a registerTool call via document.modelContext and extracts its fields', () => {
    const source = `
      document.modelContext.registerTool({
        name: 'find_products',
        description: 'Finds products matching a query in the catalog.',
        inputSchema: { type: 'object', properties: { q: { type: 'string' } } },
        annotations: { readOnlyHint: true },
        execute: async (args) => ({ results: [] }),
      });
    `;

    const tools = scanSourceForTools(source, 'site.ts');

    expect(tools).toHaveLength(1);
    expect(tools[0]).toMatchObject({
      name: 'find_products',
      description: 'Finds products matching a query in the catalog.',
      annotations: { readOnlyHint: true },
      source: 'site.ts',
    });
    expect(tools[0]?.inputSchema).toMatchObject({ type: 'object' });
  });

  it('finds a bare registerTool(...) call (no document.modelContext prefix)', () => {
    const source = `registerTool({ name: 'get_status', description: 'Gets the current status of the widget.' });`;

    const tools = scanSourceForTools(source, 'site.ts');

    expect(tools).toHaveLength(1);
    expect(tools[0]?.name).toBe('get_status');
  });

  it('finds multiple registerTool calls in one file', () => {
    const source = `
      document.modelContext.registerTool({ name: 'tool_one', description: 'First tool description here.' });
      document.modelContext.registerTool({ name: 'tool_two', description: 'Second tool description here.' });
    `;

    const tools = scanSourceForTools(source, 'site.ts');

    expect(tools.map((t) => t.name).sort()).toEqual(['tool_one', 'tool_two']);
  });

  it('ignores unrelated call expressions', () => {
    const source = `
      someOtherFunction({ name: 'not_a_tool' });
      document.modelContext.registerCanonical('retail.search_products', async () => ({}));
    `;

    const tools = scanSourceForTools(source, 'site.ts');

    expect(tools).toHaveLength(0);
  });

  it('extracts a tool with no description as undefined, not a crash', () => {
    const source = `document.modelContext.registerTool({ name: 'no_desc_tool' });`;

    const tools = scanSourceForTools(source, 'site.ts');

    expect(tools).toHaveLength(1);
    expect(tools[0]?.description).toBeUndefined();
  });
});
