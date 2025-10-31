import react from "@vitejs/plugin-react";
import dotenv from "dotenv";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

const envFiles = [".env.test.local", ".env.local", ".env"] as const;

const env = envFiles.reduce<Record<string, string>>((accumulator, file) => {
  const result = dotenv.config({ path: file });
  if (result.parsed) {
    // Later files should not override earlier files (test.local should have highest priority)
    return { ...result.parsed, ...accumulator };
  }
  return accumulator;
}, {});

export default defineConfig({
  plugins: [
    tsconfigPaths({ projects: ["./tsconfig.json"] }),
    react(),
  ],
  resolve: {
    dedupe: ["react", "react-dom"],
  },
  test: {
    root: "./",
    globals: true,
    environment: "jsdom",
    env,
    setupFiles: ["../../vitest.setup.ts"],
    include: [
      "src/**/*.test.ts",
      "src/**/*.test.tsx",
      "test/**/*.test.ts",
      "test/**/*.test.tsx",
    ],
    environmentMatchGlobs: [
      ["test/integration/**/*.test.ts", "node"],
      ["test/unit/**/*.test.ts", "jsdom"],
      ["test/unit/**/*.test.tsx", "jsdom"],
    ],
    coverage: {
      provider: "v8",
      reportsDirectory: "./coverage",
      reporter: ["text", "json", "json-summary", "html"],
      exclude: [
        "test/fixtures/**",
        "test/helpers/**",
        "test/mocks/**",
        "src/components/ui/**",
        "src/packages/**",
        ".next/**",
        "**/*.d.ts",
        "**/*.config.*",
      ],
    },
  },
});
