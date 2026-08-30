import { readFile } from 'node:fs/promises';
import fg from 'fast-glob';
import { runChecks, type CanonicalToolSummary, type Finding } from './checks.js';
import { scanSourceForTools } from './static-scan.js';

/** Scans every file matched by `glob` for registerTool(...) calls and runs the lint checks on each. */
export async function runStatic(
  glob: string,
  canonicalTools: readonly CanonicalToolSummary[],
): Promise<Finding[]> {
  const files = await fg(glob, { absolute: true });
  const findings: Finding[] = [];

  for (const file of files) {
    const source = await readFile(file, 'utf8');
    const tools = scanSourceForTools(source, file);
    for (const tool of tools) {
      findings.push(...runChecks(tool, canonicalTools));
    }
  }

  return findings;
}
