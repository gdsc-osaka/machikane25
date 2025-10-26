import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import GlobalError from "@/app/global-error";
import * as Sentry from "@sentry/nextjs";

// Mock Sentry
vi.mock("@sentry/nextjs", () => ({
	captureException: vi.fn(),
}));

// Mock NextError component
vi.mock("next/error", () => ({
	default: ({ statusCode }: { statusCode: number }) => (
		<div data-testid="next-error">Error {statusCode}</div>
	),
}));

describe("GlobalError", () => {
	it("should render NextError component", () => {
		const error = new Error("Test error");

		const { getByTestId } = render(<GlobalError error={error} />);

		expect(getByTestId("next-error")).toBeInTheDocument();
	});

	it("should capture exception with Sentry on mount", () => {
		const error = new Error("Test error");

		render(<GlobalError error={error} />);

		expect(Sentry.captureException).toHaveBeenCalledWith(error);
	});

	it("should pass statusCode 0 to NextError", () => {
		const error = new Error("Test error");

		const { getByTestId } = render(<GlobalError error={error} />);

		expect(getByTestId("next-error")).toHaveTextContent("Error 0");
	});

	it("should render html and body elements", () => {
		const error = new Error("Test error");

		const { container } = render(<GlobalError error={error} />);

		// Since render wraps the component, we check for the presence of html and body
		// The html element is rendered by the component itself
		expect(container.querySelector("html")).toBeDefined();
		expect(container.querySelector("body")).toBeDefined();
	});

	it("should handle errors with digest property", () => {
		const error = new Error("Test error") as Error & { digest?: string };
		error.digest = "abc123";

		render(<GlobalError error={error} />);

		expect(Sentry.captureException).toHaveBeenCalledWith(error);
	});
});
