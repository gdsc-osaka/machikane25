import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("swr", () => ({
	__esModule: true,
	default: vi.fn(),
}));

import useSWR, {BareFetcher} from "swr";
import type { StampProgress } from "../useStampProgress";
import { useStampProgress } from "../useStampProgress";

const originalFetch = global.fetch;
const useSWRMock = vi.mocked(useSWR);

beforeEach(() => {
	useSWRMock.mockReset();
});

afterEach(() => {
	global.fetch = originalFetch;
	vi.restoreAllMocks();
});

describe("useStampProgress", () => {
	it("maps the SWR return value to the hook contract", () => {
		const mutate = vi.fn();
		const progress: StampProgress = {
			stamps: [],
			remaining: 5,
			surveyCompleted: false,
			rewardEligible: false,
		};

		useSWRMock.mockReturnValue({
			data: progress,
			error: null,
			isLoading: false,
			isValidating: false,
			mutate,
		});

		const result = useStampProgress();

		expect(result).toEqual({
			data: progress,
			error: null,
			isLoading: false,
			refresh: mutate,
		});
	});

	it("initialises SWR with the progress key, fetcher and options", async () => {
		const mutate = vi.fn();
		let capturedFetcher: BareFetcher<unknown> | null = null;
		let capturedConfig: unknown;

		useSWRMock.mockImplementation((key, fetcher, config) => {
			capturedFetcher = fetcher;
			capturedConfig = config;
			return {
				data: undefined,
				error: null,
				isLoading: true,
				isValidating: false,
				mutate,
			};
		});

		const result = useStampProgress();

		expect(useSWRMock).toHaveBeenCalledWith(
			["stamp", "progress", "anonymous"],
			expect.any(Function),
			expect.objectContaining({
				revalidateOnFocus: true,
				refreshInterval: 60_000,
			}),
		);
		expect(result.refresh).toBe(mutate);

		const json = vi.fn().mockResolvedValue({ remaining: 3 });
		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json,
		}) as unknown as typeof fetch;

		expect(capturedFetcher).toBeDefined();

		const data = await capturedFetcher!();
		expect(global.fetch).toHaveBeenCalledWith("/api/stamps/progress", {
			cache: "no-store",
		});
		expect(json).toHaveBeenCalled();
		expect(data).toEqual({ remaining: 3 });

		expect(capturedConfig).toMatchObject({
			revalidateOnFocus: true,
			refreshInterval: 60_000,
		});
	});

	it("propagates network failures from the fetcher", async () => {
		let capturedFetcher: BareFetcher<unknown> | null = null;

		useSWRMock.mockImplementation((_, fetcher) => {
			capturedFetcher = fetcher;
			return {
				data: undefined,
				error: null,
				isLoading: true,
				isValidating: false,
				mutate: vi.fn(),
			};
		});

		useStampProgress();

		global.fetch = vi.fn().mockResolvedValue({
			ok: false,
		}) as unknown as typeof fetch;

		expect(capturedFetcher).toBeDefined();

		await expect(capturedFetcher!()).rejects.toThrow(
			"Failed to fetch stamp progress",
		);
		expect(global.fetch).toHaveBeenCalledWith("/api/stamps/progress", {
			cache: "no-store",
		});
	});
});
