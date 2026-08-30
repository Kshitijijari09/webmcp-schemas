# Contributing

## Adding or changing a canonical schema

1. Open a PR against `packages/schemas/src/schemas/<vertical>/`,
   adding both `<tool_name>.json` and `<tool_name>.example.json`. See
   [`docs/adr/0001-schema-format.md`](docs/adr/0001-schema-format.md)
   for the full field format (`id`, `name`, `title`, `description`,
   `inputSchema`, `outputSchema`, `annotations`, `stability`,
   `version`).
2. Run `pnpm --filter @webmcp-schemas/schemas test` before opening the
   PR — it validates every canonical file against the meta-schema and
   every example against its own schema, and will catch most
   formatting mistakes immediately.

## Review rubric

A PR adding or changing a canonical tool is checked against:

- **Naming:** `verb_noun`, snake_case, for both `name` and the tail of
  `id`. The verb comes from the existing controlled vocabulary
  (`search`, `get`, `add`, `remove`, `update`, `create`, `cancel`,
  `apply`, `check`, `start`). Introducing a new verb needs discussion
  in the PR description — it's not something to add casually, since
  the whole point of the registry is a small, predictable vocabulary.
- **Both files present:** every `.json` schema ships with a sibling
  `.example.json` containing a realistic `input`/`output` pair that
  actually validates against it.
- **`additionalProperties: false`** on `inputSchema`/`outputSchema`
  unless there's a stated reason not to.
- **No overlap** with an existing tool's name or purpose in the same
  vertical — if your tool does roughly the same thing as an existing
  one, extend or discuss changing that one instead of adding a
  near-duplicate.
- **`description` disambiguates.** It must read as guidance for an
  LLM choosing between this vertical's tools with no other context —
  not just a description of what the tool does, but why you'd pick it
  over its closest siblings. Reviewers will ask you to strengthen this
  if it doesn't clearly separate your tool from similar ones. See
  [`SCHEMA_STYLE.md`](SCHEMA_STYLE.md) for how to write one that
  passes this bar, with real before/after examples.
- **Correct annotations.** Reads get `readOnlyHint: true`. Anything
  with a real-world side effect a user would want to confirm before it
  runs gets `requiresConfirmation: true`.
- **Minimal `required`, enums for closed value spaces.** Only mark a
  field required if the tool genuinely can't run without it; use
  `enum` wherever the value space is closed rather than a free-form
  string.

## Proposing a new vertical

A new vertical (travel, restaurants, banking, etc. — see the list in
[`CLAUDE.md`](CLAUDE.md)) is a bigger unit of work than a single tool:
it needs its own `docs/verticals/<vertical>.md` with a worked example,
and test coverage proving every tool validates. Open an issue first to
discuss scope before submitting the schemas themselves — this avoids
duplicated or conflicting work on the same vertical.

## Code changes (runtime, lint, demo)

Standard PR flow: fork, branch, make your change with tests (this
project follows test-driven development — see existing `*.test.ts`
files for the pattern), and ensure `pnpm lint`, `pnpm typecheck`,
`pnpm test`, and `pnpm build` all pass at the repo root before opening
the PR.

## No RFC-before-PR process yet

The project is young enough that a formal RFC step would be pure
overhead. If PR churn from duplicate or conflicting proposals becomes
a real problem, that process gets introduced then — not preemptively.
