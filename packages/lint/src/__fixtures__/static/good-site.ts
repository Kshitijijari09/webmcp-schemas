// Fixture: a site that registers tools cleanly — no findings expected.
document.modelContext.registerTool({
  name: 'get_shipping_rates',
  description:
    'Returns available shipping rates for the current cart based on destination postal code.',
  inputSchema: {
    type: 'object',
    properties: {
      postalCode: { type: 'string' },
    },
    required: ['postalCode'],
    additionalProperties: false,
  },
  annotations: { readOnlyHint: true },
  execute: async (args) => ({ rates: [] }),
});
