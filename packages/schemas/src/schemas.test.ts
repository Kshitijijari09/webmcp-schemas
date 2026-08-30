import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fg from 'fast-glob';
import Ajv2020 from 'ajv/dist/2020.js';
import { describe, expect, it } from 'vitest';
import { validateCanonicalToolFile } from './validate.js';

const schemasDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'schemas');

const RETAIL_TOOLS = [
  'add_to_cart',
  'apply_filters',
  'apply_promo_code',
  'check_stock',
  'get_order_status',
  'search_products',
  'start_return',
] as const;

const REQUIRES_CONFIRMATION = new Set(['add_to_cart', 'apply_promo_code', 'start_return']);

async function loadJson(file: string): Promise<unknown> {
  return JSON.parse(await readFile(file, 'utf8'));
}

async function canonicalFiles(): Promise<string[]> {
  return fg('**/*.json', { cwd: schemasDir, ignore: ['**/*.example.json'] });
}

describe('retail vertical schema files', () => {
  it('has all seven seed retail tools', async () => {
    const files = await canonicalFiles();
    const names = files
      .filter((f) => f.startsWith('retail/'))
      .map((f) => path.basename(f, '.json'))
      .sort();

    expect(names).toEqual([...RETAIL_TOOLS].sort());
  });

  it('every canonical tool file validates against the meta-schema', async () => {
    const files = await canonicalFiles();
    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      const data = await loadJson(path.join(schemasDir, file));
      const result = validateCanonicalToolFile(data);
      expect(result.errors, `${file}: ${result.errors.join('; ')}`).toEqual([]);
    }
  });

  it('every example call validates against its sibling schema', async () => {
    const ajv = new Ajv2020({ allErrors: true, strict: false });
    const files = await canonicalFiles();

    for (const file of files) {
      const tool = (await loadJson(path.join(schemasDir, file))) as {
        inputSchema: object;
        outputSchema: object;
      };
      const examplePath = path.join(schemasDir, file.replace(/\.json$/, '.example.json'));
      const example = (await loadJson(examplePath)) as { input: unknown; output: unknown };

      const validateInput = ajv.compile(tool.inputSchema);
      expect(
        validateInput(example.input),
        `${file} example input: ${JSON.stringify(validateInput.errors)}`,
      ).toBe(true);

      const validateOutput = ajv.compile(tool.outputSchema);
      expect(
        validateOutput(example.output),
        `${file} example output: ${JSON.stringify(validateOutput.errors)}`,
      ).toBe(true);
    }
  });

  it('marks reads readOnlyHint:true and writes requiresConfirmation:true', async () => {
    const files = await canonicalFiles();
    expect(files.filter((f) => f.startsWith('retail/'))).toHaveLength(RETAIL_TOOLS.length);

    for (const file of files) {
      const tool = (await loadJson(path.join(schemasDir, file))) as {
        name: string;
        annotations: { readOnlyHint: boolean; requiresConfirmation: boolean };
      };
      const expectsConfirmation = REQUIRES_CONFIRMATION.has(tool.name);

      expect(tool.annotations.requiresConfirmation, tool.name).toBe(expectsConfirmation);
      expect(tool.annotations.readOnlyHint, tool.name).toBe(!expectsConfirmation);
    }
  });
});
