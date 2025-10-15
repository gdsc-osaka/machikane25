import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

const { captureExceptionSpy, nextErrorMock } = vi.hoisted(() => {
	return {
		captureExceptionSpy: vi.fn(),
		nextErrorMock: vi.fn(
			({ statusCode }: { statusCode: number }) => (
				<div data-testid="next-error" data-status-code={statusCode} />
			),
		),
	};
});

vi.mock("@sentry/nextjs", () => ({
	captureException: captureExceptionSpy,
}));

vi.mock("next/error", () => ({
	__esModule: true,
	default: nextErrorMock,
}));

vi.mock("react", async (importActual) => {
	const actual = await importActual<typeof import("react")>();
	return {
		...actual,
		default: actual,
		useEffect: (callback: () => void | (() => void), deps?: unknown[]) => {
			const cleanup = callback();
			return typeof cleanup === "function" ? cleanup : undefined;
		},
	};
});

afterEach(() => {
	vi.clearAllMocks();
});

test("GlobalError captures the error and renders NextError", async () => {
	const error = new Error("global-error");
	const { default: GlobalError } = await import("../global-error");

	render(<GlobalError error={error} />);

	await waitFor(() => {
		expect(captureExceptionSpy).toHaveBeenCalledWith(error);
	});

	const renderedNextError = screen.getByTestId("next-error");
	expect(renderedNextError).toBeDefined();

	expect(nextErrorMock).toHaveBeenCalled();
	const [nextErrorProps] = nextErrorMock.mock.calls[0];
	expect(nextErrorProps).toEqual({ statusCode: 0 });
});
