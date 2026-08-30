import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { runCli } from './cli-run.js';

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '__fixtures__',
  'static',
);

describe('runCli', () => {
  it('prints a usage message and exits 2 when the mode is missing', async () => {
    const result = await runCli([]);
    expect(result.exitCode).toBe(2);
    expect(result.output).toContain('Usage');
  });

  it('prints a usage message and exits 2 for an unknown mode', async () => {
    const result = await runCli(['bogus', 'target']);
    expect(result.exitCode).toBe(2);
  });

  it('exits 0 for a clean static-mode scan, human format by default', async () => {
    const result = await runCli(['static', path.join(fixturesDir, 'good-site.ts')]);
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('No findings');
  });

  it('exits 1 for a static-mode scan with error-level findings', async () => {
    const result = await runCli(['static', path.join(fixturesDir, 'bad-site.ts')]);
    expect(result.exitCode).toBe(1);
    expect(result.output).toContain('missing-description');
  });

  it('emits valid JSON with --format json', async () => {
    const result = await runCli([
      'static',
      path.join(fixturesDir, 'bad-site.ts'),
      '--format',
      'json',
    ]);
    const parsed = JSON.parse(result.output);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBeGreaterThan(0);
  });
});
