import type { ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { SWRConfig } from "swr";
import {
	DEFAULT_STAMP_PROGRESS,
	STAMP_PROGRESS_CACHE_KEY,
	useStampProgress,
} from "./use-stamp-progress";

const createWrapper =
	() =>
	({ children }: { children: ReactNode }) =>
		(
			<SWRConfig value={{ provider: () => new Map() }}>
				{children}
			</SWRConfig>
		);

const buildProgress = (completed: Array<string>) => ({
	completed,
	lastUpdatedAt: null,
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("useStampProgress", () => {
	test("calls the fetcher with the configured cache key", async () => {
		const progress = buildProgress(["reception"]);
		const fetcher = vi.fn().mockResolvedValue(progress);

		const { result } = renderHook(() => useStampProgress({ fetcher }), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.data).toEqual(progress);
		});

		expect(fetcher).toHaveBeenCalledWith(STAMP_PROGRESS_CACHE_KEY);
	});

	test("exposes default fallback progress while loading", () => {
		const neverResolving = () =>
			new Promise<ReturnType<typeof buildProgress>>(() => {});
		const { result } = renderHook(
			() => useStampProgress({ fetcher: neverResolving }),
			{ wrapper: createWrapper() },
		);
		expect(result.current.data).toEqual(DEFAULT_STAMP_PROGRESS);
	});

	test("allows providing a custom fallback progress snapshot", () => {
		const fallback = buildProgress(["reception", "photobooth"]);
		const neverResolving = () =>
			new Promise<ReturnType<typeof buildProgress>>(() => {});

		const { result } = renderHook(
			() =>
				useStampProgress({
					fetcher: neverResolving,
					fallbackData: fallback,
				}),
			{ wrapper: createWrapper() },
		);
		expect(result.current.data).toEqual(fallback);
	});
});
