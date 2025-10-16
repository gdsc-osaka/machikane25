import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { swrKeys } from "@/lib/swr/keys";
import { useStampProgress } from "../useStampProgress";

const useSWRMock = vi.fn();

vi.mock("swr", () => ({
	__esModule: true,
	default: (...args: unknown[]) => useSWRMock(...args),
}));

describe("useStampProgress", () => {
	afterEach(() => {
		useSWRMock.mockReset();
		vi.restoreAllMocks();
	});

	it("delegates to SWR with the progress key", async () => {
		const sampleResponse = {
			stamps: [],
			remaining: 0,
			surveyCompleted: false,
			rewardEligible: false,
		};

		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => sampleResponse,
		});
		globalThis.fetch = fetchMock as typeof fetch;

		let capturedKey: unknown;
		let capturedFetcher: (() => Promise<unknown>) | undefined;

		useSWRMock.mockImplementation((key, fetcher) => {
			capturedKey = key;
			capturedFetcher = fetcher;
			return {
				data: sampleResponse,
				error: undefined,
				isLoading: false,
				mutate: vi.fn(),
			};
		});

		const { result } = renderHook(() => useStampProgress());

		expect(useSWRMock).toHaveBeenCalledTimes(1);
		expect(capturedKey).toEqual(swrKeys.progress(null));
		expect(result.current.data).toEqual(sampleResponse);

		const resolved = await capturedFetcher?.();
		expect(fetchMock).toHaveBeenCalledWith("/api/stamps/progress", {
			cache: "no-store",
		});
		expect(resolved).toEqual(sampleResponse);
	});
});
