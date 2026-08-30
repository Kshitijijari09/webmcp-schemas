// Fixture: a site with several drift issues — findings expected for each.
document.modelContext.registerTool({
  name: 'no_description_tool',
  inputSchema: { type: 'object', properties: {} },
  execute: async () => ({}),
});

document.modelContext.registerTool({
  name: 'short_desc_tool',
  description: 'too short',
  inputSchema: { type: 'object', properties: {} },
  annotations: { readOnlyHint: true },
  execute: async () => ({}),
});

document.modelContext.registerTool({
  name: 'no_hint_tool',
  description: 'A tool with a perfectly fine description but no readOnlyHint set.',
  inputSchema: { type: 'object', properties: { blob: {} } },
  execute: async () => ({}),
});

document.modelContext.registerTool({
  name: 'find_products',
  description: 'Finds products in the catalog matching a free-text query string.',
  inputSchema: { type: 'object', properties: { q: { type: 'string' } } },
  annotations: { readOnlyHint: true },
  execute: async () => ({}),
});
