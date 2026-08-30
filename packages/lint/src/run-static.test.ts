import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CANONICAL_TOOLS } from '@webmcp-schemas/schemas';
import { runStatic } from './run-static.js';

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '__fixtures__',
  'static',
);
const canonicalTools = Object.values(CANONICAL_TOOLS);

describe('runStatic', () => {
  it('reports no findings for a cleanly-registered tool', async () => {
    const findings = await runStatic(path.join(fixturesDir, 'good-site.ts'), canonicalTools);
    expect(findings).toEqual([]);
  });

  it('reports one finding per issue across a file with several problems', async () => {
    const findings = await runStatic(path.join(fixturesDir, 'bad-site.ts'), canonicalTools);
    const rules = findings.map((f) => f.rule).sort();

    // no_description_tool: no description AND no annotations -> 2 findings.
    // short_desc_tool: short description only -> 1 finding.
    // no_hint_tool: no annotations AND an untyped property -> 2 findings.
    // find_products: possibly duplicates canonical search_products -> 1 finding.
    expect(rules).toEqual(
      [
        'missing-description',
        'missing-readonly-hint',
        'missing-readonly-hint',
        'short-description',
        'untyped-schema-property',
        'possible-duplicate',
      ].sort(),
    );
  });

  it('attaches the source file path to each finding', async () => {
    const findings = await runStatic(path.join(fixturesDir, 'bad-site.ts'), canonicalTools);
    expect(findings.every((f) => f.source === path.join(fixturesDir, 'bad-site.ts'))).toBe(true);
  });

  it('scans every file matched by a glob', async () => {
    const findings = await runStatic(path.join(fixturesDir, '*.ts'), canonicalTools);
    // good-site.ts contributes 0, bad-site.ts contributes 6 (see the test above).
    expect(findings).toHaveLength(6);
  });
});
