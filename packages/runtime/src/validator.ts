// Minimal, zero-dependency JSON Schema validator covering only the keyword
// subset canonical webmcp-schemas tools actually use (see ADR 0001 and
// SCHEMA_STYLE.md). Not a general-purpose validator — packages/schemas uses
// ajv (a devDependency) for full draft 2020-12 meta-schema validation in CI;
// this module ships in the browser bundle, so it stays dependency-free.

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

interface JsonSchema {
  type?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  additionalProperties?: boolean;
  enum?: unknown[];
  items?: JsonSchema;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  minItems?: number;
  maxItems?: number;
  pattern?: string;
}

// Accepts `object` rather than `JsonSchema` at the public boundary: callers
// pass deeply `readonly`-literal canonical schemas (see ADR 0001's generated
// mirrors), which don't structurally satisfy JsonSchema's mutable array/
// index-signature fields. The cast below is safe because this validator only
// ever reads from `schema` — it never mutates it.
export function validateArgs(schema: object, data: unknown): ValidationResult {
  const errors: string[] = [];
  validateValue(schema as JsonSchema, data, '(root)', errors);
  return { valid: errors.length === 0, errors };
}

function validateValue(schema: JsonSchema, value: unknown, path: string, errors: string[]): void {
  if (schema.type && !matchesType(schema.type, value)) {
    errors.push(`${path}: expected type "${schema.type}", got ${describeType(value)}`);
    return;
  }

  if (schema.enum && !schema.enum.some((allowed) => deepEqual(allowed, value))) {
    errors.push(
      `${path}: value ${JSON.stringify(value)} is not one of ${JSON.stringify(schema.enum)}`,
    );
  }

  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push(`${path}: ${value} is below minimum ${schema.minimum}`);
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      errors.push(`${path}: ${value} is above maximum ${schema.maximum}`);
    }
  }

  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push(`${path}: string shorter than minLength ${schema.minLength}`);
    }
    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      errors.push(`${path}: string longer than maxLength ${schema.maxLength}`);
    }
    if (schema.pattern !== undefined && !new RegExp(schema.pattern).test(value)) {
      errors.push(`${path}: string does not match pattern ${schema.pattern}`);
    }
  }

  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      errors.push(`${path}: array shorter than minItems ${schema.minItems}`);
    }
    if (schema.maxItems !== undefined && value.length > schema.maxItems) {
      errors.push(`${path}: array longer than maxItems ${schema.maxItems}`);
    }
    if (schema.items) {
      value.forEach((item, index) =>
        validateValue(schema.items!, item, `${path}[${index}]`, errors),
      );
    }
  }

  if (isRecord(value) && schema.properties) {
    for (const key of schema.required ?? []) {
      if (!(key in value)) {
        errors.push(`${path}.${key}: missing required property`);
      }
    }

    for (const [key, propSchema] of Object.entries(schema.properties)) {
      if (key in value) {
        validateValue(propSchema, value[key], `${path}.${key}`, errors);
      }
    }

    if (schema.additionalProperties === false) {
      for (const key of Object.keys(value)) {
        if (!(key in schema.properties)) {
          errors.push(`${path}.${key}: additional property not allowed`);
        }
      }
    }
  }
}

function matchesType(type: string, value: unknown): boolean {
  switch (type) {
    case 'object':
      return isRecord(value);
    case 'array':
      return Array.isArray(value);
    case 'string':
      return typeof value === 'string';
    case 'boolean':
      return typeof value === 'boolean';
    case 'null':
      return value === null;
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'integer':
      return typeof value === 'number' && Number.isInteger(value);
    default:
      return true;
  }
}

function describeType(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
