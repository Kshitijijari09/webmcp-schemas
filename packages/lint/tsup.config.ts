import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: { index: 'src/index.ts' },
    format: ['esm', 'cjs'],
    platform: 'node',
    // tsup's own shim for import.meta.url under the CJS build target —
    // esbuild itself doesn't provide one. Without this, run-live.ts's
    // createRequire(import.meta.url) resolves against `undefined` in the
    // published dist/index.cjs.
    shims: true,
    dts: true,
    clean: true,
    sourcemap: true,
  },
  {
    // ESM only: cli.ts uses top-level await, which esbuild can't target at
    // CJS, and a CLI entrypoint doesn't need to be require()-able anyway.
    entry: { cli: 'src/cli.ts' },
    format: ['esm'],
    platform: 'node',
    dts: true,
    clean: false,
    sourcemap: true,
  },
]);
