/**
 * Test stub for the `server-only` package.
 *
 * The real module throws on import outside a React Server Component, which is
 * exactly the build-time guarantee we want in the app — and exactly what would
 * stop a plain Node test runner from importing `lib/server/*`. `vitest.config.ts`
 * aliases the package to this empty module for tests only; the app's own build
 * still gets the real one.
 */
export {};
