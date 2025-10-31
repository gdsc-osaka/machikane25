import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import dotenv from "dotenv";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

const rootDir = dirname(fileURLToPath(import.meta.url));
const artBackendDir = resolve(rootDir, "apps/art-backend");

export default defineConfig({
	define: {
		"import.meta.vitest": false,
	},
	plugins: [tsconfigPaths(), react()],
	resolve: {
		dedupe: ["react", "react-dom"],
		alias: {
			sharp: resolve(artBackendDir, "test/stubs/sharp.ts"),
		},
	},
	test: {
		env: dotenv.config({ path: ".env" }).parsed,
		globals: true,
		environment: "jsdom",
		setupFiles: "../../vitest.setup.ts",
		include: ["**/*.test.ts", "**/*.test.tsx"],
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "json-summary", "html"],
			exclude: [
				"**/node_modules/**",
				"**/dist/**",
				"**/coverage/**",
				"**/.{idea,git,cache,output,temp}/**",
				"**/{vite,vitest,tailwind,postcss}.config.*",

				"src/components/ui/**",
				"src/packages/**",
				"scripts/**",
				"**/*.d.ts",
			],
		},
	},
});
