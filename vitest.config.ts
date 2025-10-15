import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
	define: {
		"import.meta.vitest": false,
	},
	plugins: [tsconfigPaths(), react()],
	resolve: {
		dedupe: ["react", "react-dom"],
	},
	test: {
		globals: true,
		environment: "jsdom",
		setupFiles: "../../vitest.setup.ts",
		include: ["**/*.test.ts", "**/*.test.tsx"],
		exclude: ["**/node_modules/**", "apps/photo/src/components/ui/*.tsx", "apps/stamp/src/components/ui/*.tsx"],
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "json-summary", "html"],
		},
	},
});
