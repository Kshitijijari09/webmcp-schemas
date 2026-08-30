#!/usr/bin/env node
// CI-only check (run by .github/workflows/schemas.yml on pull_request): a
// canonical file marked stability:"stable" must bump its own `version`
// field whenever anything else about it changes. This is a stronger
// guarantee than "the package's version changed" — see CLAUDE.md's
// Versioning section and ADR 0001.

import { execFileSync } from 'node:child_process';
import { findStableVersionViolations } from './stable-version-check-logic.mjs';

const SCHEMAS_GLOB_PREFIX = 'packages/schemas/src/schemas/';

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8' });
}

function changedCanonicalFiles(baseRef) {
  const diffOutput = git(['diff', '--name-only', `${baseRef}...HEAD`]);
  return diffOutput
    .split('\n')
    .filter((line) => line.startsWith(SCHEMAS_GLOB_PREFIX))
    .filter((line) => line.endsWith('.json') && !line.endsWith('.example.json'));
}

function readAtRef(ref, path) {
  try {
    // stdio suppresses git's own "fatal: path ... exists on disk, but not
    // in <ref>" stderr noise for the expected "new file" case — we already
    // handle that via the catch below, so it shouldn't print to CI logs.
    return execFileSync('git', ['show', `${ref}:${path}`], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return undefined; // file didn't exist at that ref (new file)
  }
}

function main() {
  const baseRef = process.env.SCHEMAS_CHECK_BASE_REF;
  if (!baseRef) {
    console.error('SCHEMAS_CHECK_BASE_REF is required (e.g. origin/master).');
    process.exit(2);
  }

  const changedFiles = changedCanonicalFiles(baseRef);
  if (changedFiles.length === 0) {
    console.log('No canonical schema files changed.');
    return;
  }

  const violations = findStableVersionViolations(changedFiles, {
    readBefore: (file) => readAtRef(baseRef, file),
    readAfter: (file) => readAtRef('HEAD', file),
  });

  if (violations.length > 0) {
    console.error('The following stable canonical files changed without a version bump:');
    for (const file of violations) console.error(`  - ${file}`);
    console.error('\nBump `version` in each file above, or revert the unrelated change.');
    process.exit(1);
  }

  console.log(
    `Checked ${changedFiles.length} changed canonical file(s); no stable-version violations.`,
  );
}

main();
