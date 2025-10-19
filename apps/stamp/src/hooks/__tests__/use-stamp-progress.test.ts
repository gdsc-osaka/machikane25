import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
	StampProgressCacheKey,
	StampProgressSnapshot,
} from "@/hooks/use-stamp-progress";

type SwrInvocation = {
	config:
		| {
				fallbackData: StampProgressSnapshot;
				revalidateOnFocus?: boolean;
		  }
		| undefined;
	fetcher: (() => Promise<StampProgressSnapshot>) | undefined;
	key: StampProgressCacheKey | null;
};

const swrInvocations: Array<SwrInvocation> = [];
const swrResult = { data: null };

vi.mock("swr", () => {
	const mockedUseSWR = (
		key: SwrInvocation["key"],
		fetcher: SwrInvocation["fetcher"],
		config: SwrInvocation["config"],
	) => {
		swrInvocations.push({ key, fetcher, config });
		return swrResult;
	};
	return {
		__esModule: true,
		default: mockedUseSWR,
	};
});

const importHookModule = async () => {
	vi.resetModules();
	return import("@/hooks/use-stamp-progress");
};

beforeEach(() => {
	swrInvocations.splice(0);
});

describe("useStampProgress", () => {
	it("creates deterministic cache keys", async () => {
		const hookModule = await importHookModule();
		expect(hookModule.STAMP_PROGRESS_CACHE_KEY).toBe("stamp-progress");
		expect(hookModule.createStampProgressKey("attendee-1")).toEqual([
			"stamp-progress",
			"attendee-1",
		]);
	});

	it("invokes SWR with fallback data when attendee id present", async () => {
		const hookModule = await importHookModule();
		const result = hookModule.useStampProgress("attendee-2");

		expect(result).toBe(swrResult);
		expect(swrInvocations).toHaveLength(1);

		const invocation = swrInvocations[0];
		expect(invocation.key).toEqual([
			hookModule.STAMP_PROGRESS_CACHE_KEY,
			"attendee-2",
		]);
		expect(invocation.fetcher).toBeTypeOf("function");
		const fallback = invocation.config?.fallbackData;
		expect(fallback).toEqual(hookModule.createEmptyStampProgress());
		expect(fallback).not.toBe(hookModule.createEmptyStampProgress());
		expect(invocation.config?.revalidateOnFocus).toBe(false);
	});

	it("skips fetching when attendee id missing", async () => {
		const hookModule = await importHookModule();
		hookModule.useStampProgress(null);

		expect(swrInvocations).toHaveLength(1);
		const invocation = swrInvocations[0];
		expect(invocation.key).toBeNull();
		expect(invocation.fetcher).toBeUndefined();
		expect(invocation.config?.fallbackData).toEqual(
			hookModule.createEmptyStampProgress(),
		);
	});
});
