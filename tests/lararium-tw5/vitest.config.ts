const root = new URL(".", import.meta.url).pathname;

// Fixture-backed isolated-Lararium TW5 test config. The original `promote/`
// subdir retired 2026-05-31 under the residency-model cleanup. Residency-
// action fixture-backed tests (Sprint 5+) will land under `residency/`.
export default {
  root,
  test: {
    environment: "node",
    include: ["residency/**/*.test.ts"],
  },
};