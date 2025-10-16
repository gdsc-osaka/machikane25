import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, test, vi } from "vitest";

const { captureExceptionSpy, nextErrorMock, effectCallbacks } = vi.hoisted(
	() => {
		return {
			captureExceptionSpy: vi.fn(),
			nextErrorMock: vi.fn(({ statusCode }: { statusCode: number }) => (
				<div data-testid="next-error" data-status-code={statusCode} />
			)),
			effectCallbacks: [] as Array<() => void | (() => void)>,
		};
	},
);

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
			effectCallbacks.push(callback);
		},
	};
});

afterEach(() => {
	vi.clearAllMocks();
	effectCallbacks.length = 0;
});

test("GlobalError captures the error and renders NextError", async () => {
	const error = new Error("global-error");
	const { default: GlobalError } = await import("../global-error");

	const markup = renderToStaticMarkup(<GlobalError error={error} />);

	for (const runEffect of effectCallbacks) {
		const cleanup = runEffect();
		if (typeof cleanup === "function") {
			cleanup();
		}
	}

	expect(markup).toContain('data-testid="next-error"');
	expect(captureExceptionSpy).toHaveBeenCalledWith(error);

	expect(nextErrorMock).toHaveBeenCalled();
	const [nextErrorProps] = nextErrorMock.mock.calls[0];
	expect(nextErrorProps).toEqual({ statusCode: 0 });
});
