import ts from 'typescript';
import type { FoundTool } from './checks.js';

/**
 * Scans TypeScript/JavaScript source for `registerTool({...})` call
 * expressions — `document.modelContext.registerTool(...)`, a bare
 * `registerTool(...)`, or any `<expr>.registerTool(...)` — and extracts a
 * FoundTool from each one whose first argument is a static object literal.
 * Deliberately does not match `registerCanonical`/`registerPack` calls:
 * those already pull from the canonical registry by construction.
 */
export function scanSourceForTools(sourceText: string, fileName: string): FoundTool[] {
  const sourceFile = ts.createSourceFile(
    fileName,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const found: FoundTool[] = [];

  function visit(node: ts.Node): void {
    if (ts.isCallExpression(node) && isRegisterToolCall(node)) {
      const firstArg = node.arguments[0];
      if (firstArg && ts.isObjectLiteralExpression(firstArg)) {
        const tool = extractTool(firstArg, fileName);
        if (tool) found.push(tool);
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return found;
}

function isRegisterToolCall(node: ts.CallExpression): boolean {
  const callee = node.expression;
  if (ts.isIdentifier(callee)) return callee.text === 'registerTool';
  if (ts.isPropertyAccessExpression(callee)) return callee.name.text === 'registerTool';
  return false;
}

function extractTool(obj: ts.ObjectLiteralExpression, fileName: string): FoundTool | undefined {
  const name = getStringProperty(obj, 'name');
  if (!name) return undefined;

  return {
    name,
    description: getStringProperty(obj, 'description'),
    inputSchema: getEvaluatedProperty(obj, 'inputSchema'),
    annotations: getEvaluatedProperty(obj, 'annotations') as FoundTool['annotations'],
    source: fileName,
  };
}

function findProperty(obj: ts.ObjectLiteralExpression, key: string): ts.Expression | undefined {
  for (const prop of obj.properties) {
    if (!ts.isPropertyAssignment(prop)) continue;
    const propName = prop.name;
    const matches =
      (ts.isIdentifier(propName) && propName.text === key) ||
      (ts.isStringLiteral(propName) && propName.text === key);
    if (matches) return prop.initializer;
  }
  return undefined;
}

function getStringProperty(obj: ts.ObjectLiteralExpression, key: string): string | undefined {
  const value = findProperty(obj, key);
  return value && ts.isStringLiteral(value) ? value.text : undefined;
}

function getEvaluatedProperty(obj: ts.ObjectLiteralExpression, key: string): unknown {
  const value = findProperty(obj, key);
  return value ? evaluateExpression(value) : undefined;
}

function evaluateExpression(node: ts.Expression): unknown {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (node.kind === ts.SyntaxKind.NullKeyword) return null;
  if (ts.isArrayLiteralExpression(node)) return node.elements.map(evaluateExpression);
  if (ts.isObjectLiteralExpression(node)) {
    const result: Record<string, unknown> = {};
    for (const prop of node.properties) {
      if (!ts.isPropertyAssignment(prop)) continue;
      const propName = prop.name;
      if (ts.isIdentifier(propName) || ts.isStringLiteral(propName)) {
        result[propName.text] = evaluateExpression(prop.initializer);
      }
    }
    return result;
  }
  // Not a static literal (a function, identifier reference, etc.) — nothing
  // to statically evaluate, e.g. an `execute` handler.
  return undefined;
}
