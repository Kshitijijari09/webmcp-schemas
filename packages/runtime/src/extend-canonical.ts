import { CANONICAL_TOOLS, type CanonicalToolId } from '@webmcp-schemas/schemas';

interface PropertySchema {
  type?: string;
  [key: string]: unknown;
}

export interface CanonicalExtension {
  inputSchema: {
    properties?: Record<string, PropertySchema>;
    required?: readonly string[];
  };
}

export interface ExtendedSchema {
  inputSchema: object;
}

/**
 * Additive-only extension of a canonical tool's inputSchema: merges new
 * optional properties (and any new required fields the extension adds) into
 * the canonical schema. Never removes a canonical property — the merge is
 * structurally incapable of dropping a key — and throws if the extension
 * tries to change an existing canonical property's `type`.
 */
export function extendCanonical<Id extends CanonicalToolId>(
  id: Id,
  extension: CanonicalExtension,
): ExtendedSchema {
  const tool = (
    CANONICAL_TOOLS as Record<string, (typeof CANONICAL_TOOLS)[CanonicalToolId] | undefined>
  )[id];
  if (!tool) {
    throw new Error(`extendCanonical: unknown canonical tool id "${String(id)}"`);
  }

  const canonicalSchema = tool.inputSchema as {
    properties?: Record<string, PropertySchema>;
    required?: readonly string[];
    [key: string]: unknown;
  };
  const canonicalProperties = canonicalSchema.properties ?? {};
  const extraProperties = extension.inputSchema.properties ?? {};

  for (const [key, canonicalProp] of Object.entries(canonicalProperties)) {
    const extraProp = extraProperties[key];
    if (extraProp && extraProp.type !== undefined && extraProp.type !== canonicalProp.type) {
      throw new Error(
        `extendCanonical: cannot retype canonical field "${key}" (was "${canonicalProp.type}", got "${extraProp.type}")`,
      );
    }
  }

  const mergedRequired = Array.from(
    new Set([...(canonicalSchema.required ?? []), ...(extension.inputSchema.required ?? [])]),
  );

  return {
    inputSchema: {
      ...canonicalSchema,
      properties: { ...canonicalProperties, ...extraProperties },
      required: mergedRequired,
    },
  };
}
