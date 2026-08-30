export interface FoundTool {
  name: string;
  description?: string;
  inputSchema?: unknown;
  annotations?: { readOnlyHint?: boolean; [key: string]: unknown };
  source?: string;
}

export interface CanonicalToolSummary {
  id: string;
  name: string;
  title: string;
}

export interface Finding {
  level: 'error' | 'warning';
  rule: string;
  message: string;
  tool: string;
  source?: string;
}

const MIN_DESCRIPTION_LENGTH = 20;

export function runChecks(
  tool: FoundTool,
  canonicalTools: readonly CanonicalToolSummary[],
): Finding[] {
  return [
    ...checkDescription(tool),
    ...checkReadOnlyHint(tool),
    ...checkUntypedSchemaProperties(tool),
    ...checkPossibleDuplicate(tool, canonicalTools),
  ];
}

function finding(level: Finding['level'], rule: string, message: string, tool: FoundTool): Finding {
  return { level, rule, message, tool: tool.name, source: tool.source };
}

function checkDescription(tool: FoundTool): Finding[] {
  if (!tool.description || tool.description.trim().length === 0) {
    return [
      finding('error', 'missing-description', `Tool "${tool.name}" has no description.`, tool),
    ];
  }
  if (tool.description.trim().length < MIN_DESCRIPTION_LENGTH) {
    return [
      finding(
        'warning',
        'short-description',
        `Tool "${tool.name}" has a description shorter than ${MIN_DESCRIPTION_LENGTH} characters — too short for an agent to disambiguate it from similar tools.`,
        tool,
      ),
    ];
  }
  return [];
}

function checkReadOnlyHint(tool: FoundTool): Finding[] {
  if (tool.annotations?.readOnlyHint === undefined) {
    return [
      finding(
        'warning',
        'missing-readonly-hint',
        `Tool "${tool.name}" doesn't set annotations.readOnlyHint — agents can't tell whether calling it is safe without side effects.`,
        tool,
      ),
    ];
  }
  return [];
}

function checkUntypedSchemaProperties(tool: FoundTool): Finding[] {
  const properties = getSchemaProperties(tool.inputSchema);
  if (!properties) return [];

  const findings: Finding[] = [];
  for (const [key, value] of Object.entries(properties)) {
    if (isUntypedBlob(value)) {
      findings.push(
        finding(
          'warning',
          'untyped-schema-property',
          `Tool "${tool.name}" has an untyped property "${key}" in its input schema — give it a "type" so agents (and this linter) know its shape.`,
          tool,
        ),
      );
    }
  }
  return findings;
}

function getSchemaProperties(schema: unknown): Record<string, unknown> | undefined {
  if (typeof schema !== 'object' || schema === null) return undefined;
  const properties = (schema as { properties?: unknown }).properties;
  if (typeof properties !== 'object' || properties === null) return undefined;
  return properties as Record<string, unknown>;
}

function isUntypedBlob(propertySchema: unknown): boolean {
  if (typeof propertySchema !== 'object' || propertySchema === null) return false;
  const keys = Object.keys(propertySchema);
  return !keys.includes('type') && !keys.includes('enum') && !keys.includes('$ref');
}

/**
 * Heuristic only: splits a `verb_noun` tool name into its verb and object
 * portions and flags a found tool whose object matches a canonical tool's
 * object under a different verb+name — e.g. `find_products` vs the
 * canonical `search_products`. Never claims certainty; always phrased as a
 * suggestion.
 */
function checkPossibleDuplicate(
  tool: FoundTool,
  canonicalTools: readonly CanonicalToolSummary[],
): Finding[] {
  const { object } = splitVerbNoun(tool.name);
  if (!object) return [];

  for (const canonical of canonicalTools) {
    if (canonical.name === tool.name) continue;
    const { object: canonicalObject } = splitVerbNoun(canonical.name);
    if (canonicalObject && canonicalObject === object) {
      return [
        finding(
          'warning',
          'possible-duplicate',
          `Tool "${tool.name}" may duplicate the canonical tool "${canonical.name}" (${canonical.id}) under a different name — consider registering that canonical tool instead.`,
          tool,
        ),
      ];
    }
  }
  return [];
}

function splitVerbNoun(name: string): { verb?: string; object?: string } {
  const parts = name.split('_').filter(Boolean);
  if (parts.length < 2) return {};
  const [verb, ...rest] = parts;
  return { verb, object: rest.join('_') };
}
