import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      enabled: true,
      reporter: "text",
      thresholds: {
        lines: 90,
        statements: 90,
        branches: 85,
        functions: 100,
      },
    },
  },
});
