import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    retail: 'src/verticals/retail.ts',
  },
  format: ['esm', 'cjs'],
  // Inline json-schema-to-ts (+ ts-algebra) types into the .d.ts: they are
  // devDependencies, so consumers could not resolve them (TS2307 / silent any).
  // The named form resolve: [...] leaves broken relative imports; true works.
  dts: { resolve: true },
  clean: true,
  sourcemap: true,
});
