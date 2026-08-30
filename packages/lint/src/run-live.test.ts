import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CANONICAL_TOOLS } from '@webmcp-schemas/schemas';
import { runLive } from './run-live.js';

const fixtureUrl = pathToFileURL(
  path.join(path.dirname(fileURLToPath(import.meta.url)), '__fixtures__', 'live', 'page.html'),
).href;
const canonicalTools = Object.values(CANONICAL_TOOLS);

describe('runLive', () => {
  it('enumerates document.modelContext.getTools() and runs checks against them', async () => {
    const findings = await runLive(fixtureUrl, canonicalTools);

    // find_products: possibly duplicates canonical search_products -> 1 finding.
    // get_shipping_rates: clean -> 0 findings.
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ rule: 'possible-duplicate', tool: 'find_products' });
  }, 30000);

  it('attaches the scanned URL as the source of each finding', async () => {
    const findings = await runLive(fixtureUrl, canonicalTools);
    expect(findings.every((f) => f.source === fixtureUrl)).toBe(true);
  }, 30000);
});
