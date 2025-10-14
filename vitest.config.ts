import { defineConfig } from 'vitest/config';
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
    define: {
        'import.meta.vitest': false,
    },
    plugins: [
        tsconfigPaths(),
    ],
    test: {
        globals: true,
        include: ['test/**/*.test.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
        },
    },
});