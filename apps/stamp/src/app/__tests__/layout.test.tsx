import { expect, test } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import RootLayout from "../layout";

vi.mock("../globals.css", () => ({}));
// mock Geist font
vi.mock("next/font/google", async (importActual) => {
	const actual = await importActual<typeof import("next/font/google")>();
	return {
		...actual,
		Geist: () => ({ variable: "--font-geist-sans" }),
		Geist_Mono: () => ({ variable: "--font-geist-mono" }),
	};
});

test("RootLayout", () => {
	const markup = renderToStaticMarkup(
		<RootLayout>
			<div data-testid="child-element">Hello World</div>
		</RootLayout>,
	);

	expect(markup).toContain("Hello World");
});
