import { CANONICAL_TOOLS } from '@webmcp-schemas/schemas';
import type { Finding } from './checks.js';
import { runStatic } from './run-static.js';
import { runLive } from './run-live.js';

export interface CliResult {
  exitCode: number;
  output: string;
}

const USAGE = 'Usage: webmcp-lint <static|live> <glob-or-url> [--format json]';

export async function runCli(argv: string[]): Promise<CliResult> {
  const [mode, target, ...rest] = argv;

  if ((mode !== 'static' && mode !== 'live') || !target) {
    return { exitCode: 2, output: USAGE };
  }

  const formatFlagIndex = rest.indexOf('--format');
  const format = formatFlagIndex !== -1 && rest[formatFlagIndex + 1] === 'json' ? 'json' : 'human';

  const canonicalTools = Object.values(CANONICAL_TOOLS);
  const findings =
    mode === 'static'
      ? await runStatic(target, canonicalTools)
      : await runLive(target, canonicalTools);

  const output = format === 'json' ? JSON.stringify(findings, null, 2) : formatHuman(findings);
  const exitCode = findings.some((f) => f.level === 'error') ? 1 : 0;

  return { exitCode, output };
}

function formatHuman(findings: Finding[]): string {
  if (findings.length === 0) return 'No findings.';
  return findings
    .map(
      (f) =>
        `${f.level.toUpperCase()} [${f.rule}] ${f.tool} (${f.source ?? 'unknown'}): ${f.message}`,
    )
    .join('\n');
}
