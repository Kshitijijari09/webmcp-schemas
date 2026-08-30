import { createRequire } from 'node:module';
import { chromium } from 'playwright';
import { runChecks, type CanonicalToolSummary, type Finding, type FoundTool } from './checks.js';

// createRequire(import.meta.url), not import.meta.resolve: esbuild shims
// import.meta.url for a CJS build target, but import.meta.resolve has no
// CJS equivalent at all — it broke this package's own dual ESM/CJS build.
const polyfillPath = createRequire(import.meta.url).resolve('@mcp-b/webmcp-polyfill/iife');

interface RawTool {
  name: string;
  description: string;
  inputSchema?: unknown;
  annotations?: FoundTool['annotations'];
}

/**
 * Launches headless Chromium, injects the WebMCP polyfill (so a site that
 * doesn't yet ship it natively still registers tools we can see), navigates
 * to `url`, and enumerates `document.modelContext.getTools()`, running the
 * same checks static mode runs against each one.
 */
export async function runLive(
  url: string,
  canonicalTools: readonly CanonicalToolSummary[],
): Promise<Finding[]> {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.addInitScript({ path: polyfillPath });
    await page.goto(url, { waitUntil: 'networkidle' });
    // registerTool() is async in the real API; give synchronous
    // registration scripts a moment to actually resolve before enumerating.
    await page.waitForTimeout(300);

    const tools = await page.evaluate(async () => {
      const modelContext = (
        document as unknown as { modelContext?: { getTools(): Promise<RawTool[]> } }
      ).modelContext;
      if (!modelContext) return [];
      const registered = await modelContext.getTools();
      return registered.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
        annotations: tool.annotations,
      }));
    });

    const findings: Finding[] = [];
    for (const tool of tools as RawTool[]) {
      findings.push(...runChecks({ ...tool, source: url }, canonicalTools));
    }
    return findings;
  } finally {
    await browser.close();
  }
}
