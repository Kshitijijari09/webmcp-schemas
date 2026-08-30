import Ajv2020 from 'ajv/dist/2020.js';
import type { ErrorObject } from 'ajv';
import metaSchema from './meta-schema.json';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const ajv = new Ajv2020({ allErrors: true, strict: false });
const validateEnvelope = ajv.compile(metaSchema);

export function validateCanonicalToolFile(data: unknown): ValidationResult {
  const errors: string[] = [];

  if (!validateEnvelope(data)) {
    errors.push(...formatAjvErrors(validateEnvelope.errors));
  }

  if (isRecord(data)) {
    if (typeof data.id === 'string' && typeof data.name === 'string') {
      const tail = data.id.split('.').slice(1).join('.');
      if (tail !== data.name) {
        errors.push(
          `id "${data.id}" does not match name "${data.name}" (expected id to end in ".${data.name}")`,
        );
      }
    }

    for (const field of ['inputSchema', 'outputSchema'] as const) {
      if (field in data && !ajv.validateSchema(data[field] as object)) {
        errors.push(
          `${field} is not a valid JSON Schema (draft 2020-12): ${formatAjvErrors(ajv.errors).join('; ')}`,
        );
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function formatAjvErrors(errors: ErrorObject[] | null | undefined): string[] {
  return (errors ?? []).map((error) =>
    `${error.instancePath || '(root)'} ${error.message ?? 'is invalid'}`.trim(),
  );
}
