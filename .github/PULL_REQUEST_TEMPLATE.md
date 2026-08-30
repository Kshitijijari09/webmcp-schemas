## What does this PR do?

<!-- One or two sentences. -->

## Checklist

- [ ] If this adds/changes a canonical schema: both `<tool>.json` and
      `<tool>.example.json` are present, and I've read
      [`SCHEMA_STYLE.md`](../SCHEMA_STYLE.md) for how to write a
      `description` that disambiguates this tool from its siblings.
- [ ] `pnpm --filter @webmcp-schemas/schemas test` passes (meta-schema + example validation) — required for any schema change.
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` all
      pass at the repo root — required for any code change.
- [ ] If this is a new tool or vertical, I opened (or linked) an issue
      first per [`CONTRIBUTING.md`](../CONTRIBUTING.md).

## Anything reviewers should look at specifically?

<!-- Optional — a tricky decision, an alternative you considered, a naming question you're unsure about. -->
