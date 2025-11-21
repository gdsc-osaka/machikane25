import type { Config } from "tailwindcss";

const config: Config = {
	content: [
		"./src/app/**/*.{ts,tsx}",
		"./src/components/**/*.{ts,tsx}",
		"./src/libs/i18n/**/*.{ts,tsx}",
	],
	darkMode: "class",
	theme: {
		extend: {
			colors: {
				"pro-badge": "#FFD700",
			},
		},
	},
	plugins: [],
};

export default config;
