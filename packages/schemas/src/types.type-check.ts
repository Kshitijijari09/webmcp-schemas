// Compile-only fixture proving the FromSchema-based type derivation (ADR 0001)
// actually works. Not part of the build entry (tsup only bundles from
// index.ts) — this file exists purely for `tsc --noEmit` to exercise.
import type { ById, CanonicalTool, SchemaInputOf, SchemaOutputOf } from './types.js';

const exampleTool = {
  id: 'fixture.example_tool',
  name: 'example_tool',
  title: 'Example',
  description: 'Fixture tool used only to compile-check the FromSchema-based type derivation.',
  inputSchema: {
    type: 'object',
    properties: { query: { type: 'string' } },
    required: ['query'],
    additionalProperties: false,
  },
  outputSchema: {
    type: 'object',
    properties: { count: { type: 'number' } },
    required: ['count'],
    additionalProperties: false,
  },
  annotations: { readOnlyHint: true, untrustedContentHint: false, requiresConfirmation: false },
  stability: 'draft',
  version: '0.1.0',
} as const satisfies CanonicalTool;

type ExampleInput = SchemaInputOf<typeof exampleTool>;
type ExampleOutput = SchemaOutputOf<typeof exampleTool>;

// Positive: a correctly-typed input is assignable.
const goodInput: ExampleInput = { query: 'shoes' };
void goodInput;

// Negative: a missing required field must fail to compile.
// @ts-expect-error missing required "query"
const badInput: ExampleInput = {};
void badInput;

// Negative: wrong property type must fail to compile.
// @ts-expect-error query must be a string, not a number
const badInput2: ExampleInput = { query: 123 };
void badInput2;

const goodOutput: ExampleOutput = { count: 3 };
void goodOutput;

// Positive: ById produces an id-keyed map preserving the literal tool type.
type ExampleById = ById<[typeof exampleTool]>;
const idLookup: ExampleById['fixture.example_tool'] = exampleTool;
void idLookup;
