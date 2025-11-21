import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import RootLayout from "@/app/layout";

// Mock Next.js font
vi.mock("next/font/google", () => ({
	Google_Sans_Code: () => ({
		variable: "--font-google-sans-code",
		subsets: ["latin"],
	}),
	Noto_Sans_JP: () => ({
		variable: "--font-noto-sans-jp",
		subsets: ["latin"],
	}),
}));

vi.mock("next/font/local", () => ({
	default: () => ({
		variable: "--font-google-sans",
		style: { fontFamily: "Google Sans" },
	}),
}));

// Mock globals.css to avoid PostCSS issues
vi.mock("@/app/globals.css", () => ({}));

describe("RootLayout", () => {
	it("should render children", () => {
		const { getByTestId } = render(
			<RootLayout>
				<div data-testid="test-child">Test Content</div>
			</RootLayout>,
		);

		expect(getByTestId("test-child")).toBeInTheDocument();
		expect(getByTestId("test-child")).toHaveTextContent("Test Content");
	});

	it("should render with correct structure", () => {
		const { container } = render(
			<RootLayout>
				<div>Test</div>
			</RootLayout>,
		);

		// The layout should render the children
		expect(container).toBeDefined();
		expect(container.textContent).toContain("Test");
	});
});
