// Pure logic for check-stable-version-bump.mjs, separated out so it can be
// unit tested without shelling out to git. `readBefore`/`readAfter` are
// injected so tests can supply fixture content directly.

function withoutVersion(tool) {
  const { version, ...rest } = tool;
  void version;
  return rest;
}

/**
 * @param {string[]} changedFiles
 * @param {{ readBefore: (file: string) => string | undefined, readAfter: (file: string) => string }} readers
 * @returns {string[]} files that are stability:"stable", changed some
 *   non-version field, but did not bump `version`
 */
export function findStableVersionViolations(changedFiles, { readBefore, readAfter }) {
  const violations = [];

  for (const file of changedFiles) {
    const beforeRaw = readBefore(file);
    if (beforeRaw === undefined) continue; // new file, nothing to bump

    const before = JSON.parse(beforeRaw);
    if (before.stability !== 'stable') continue; // only stable files are gated

    const after = JSON.parse(readAfter(file));

    const contentChanged =
      JSON.stringify(withoutVersion(before)) !== JSON.stringify(withoutVersion(after));
    const versionChanged = before.version !== after.version;

    if (contentChanged && !versionChanged) {
      violations.push(file);
    }
  }

  return violations;
}
