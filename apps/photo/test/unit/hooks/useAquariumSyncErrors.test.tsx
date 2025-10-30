import { act, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAquariumSyncErrorsActionMock, mutateMock, useSWRMock } = vi.hoisted(
	() => ({
		getAquariumSyncErrorsActionMock: vi.fn(),
		mutateMock: vi.fn(),
		useSWRMock: vi.fn(),
	}),
);

vi.mock("@/app/actions/adminActions", () => ({
	getAquariumSyncErrorsAction: getAquariumSyncErrorsActionMock,
}));

vi.mock("swr", () => ({
	__esModule: true,
	default: (
		key: unknown,
		fetcher: () => Promise<unknown>,
		options: unknown,
	) => useSWRMock(key, fetcher, options),
}));

describe("useAquariumSyncErrors", () => {
	beforeEach(() => {
		getAquariumSyncErrorsActionMock.mockReset();
		useSWRMock.mockReset();
		mutateMock.mockReset();
	});

	it("maps sync errors to include Date objects and supports refresh", async () => {
		let capturedFetcher: (() => Promise<unknown>) | undefined;
		useSWRMock.mockImplementation(
			(
				key: unknown,
				fetcher: () => Promise<unknown>,
				options: Record<string, unknown>,
			) => {
				expect(key).toBe("aquarium-sync-errors");
				expect(options).toMatchObject({ refreshInterval: 5000 });
				capturedFetcher = fetcher;
				return {
					data: [
						{
							eventId: "evt-1",
							photoId: "photo-1",
							errorMessage: "failed",
							issueUrl: "https://example.com/issues/1",
							timestamp: "2025-01-01T00:00:00.000Z",
						},
					],
					isLoading: false,
					error: null,
					mutate: mutateMock.mockResolvedValue([
						{
							eventId: "evt-2",
							photoId: "photo-2",
							errorMessage: "another failure",
							issueUrl: "https://example.com/issues/2",
							timestamp: "invalid-date",
						},
					]),
				};
			},
		);

		const { useAquariumSyncErrors } = await import(
			"@/hooks/useAquariumSyncErrors"
		);
		let state: ReturnType<typeof useAquariumSyncErrors> | undefined;

		const TestComponent = () => {
			state = useAquariumSyncErrors();
			return null;
		};

		render(<TestComponent />);

		// Ensure SWR fetcher delegates to server action
		expect(capturedFetcher).toBeDefined();
		if (capturedFetcher) {
			getAquariumSyncErrorsActionMock.mockResolvedValueOnce([]);
			await capturedFetcher();
			expect(getAquariumSyncErrorsActionMock).toHaveBeenCalledOnce();
		}

		expect(state?.isLoading).toBe(false);
		expect(state?.error).toBeNull();
		expect(state?.errors).toHaveLength(1);
		expect(state?.errors[0]?.timestamp.toISOString()).toBe(
			"2025-01-01T00:00:00.000Z",
		);

		let refreshResult: unknown;
		await act(async () => {
			refreshResult = await state?.refresh();
		});

		expect(mutateMock).toHaveBeenCalledOnce();
		expect(Array.isArray(refreshResult)).toBe(true);
		const [refreshed] = (refreshResult ?? []) as Array<{
			timestamp: Date;
			eventId: string;
		}>;
		expect(refreshed?.eventId).toBe("evt-2");
		expect(refreshed?.timestamp instanceof Date).toBe(true);
		expect(refreshed?.timestamp.toISOString()).toBe(
			new Date(0).toISOString(),
		);
	});

	it("derives generic error when swr error is not instance of Error", async () => {
		useSWRMock.mockReturnValue({
			data: undefined,
			isLoading: false,
			error: "boom",
			mutate: mutateMock,
		});

		const { useAquariumSyncErrors } = await import(
			"@/hooks/useAquariumSyncErrors"
		);
		let state: ReturnType<typeof useAquariumSyncErrors> | undefined;

		const TestComponent = () => {
			state = useAquariumSyncErrors();
			return null;
		};

		render(<TestComponent />);

		expect(state?.error?.message).toBe("Failed to load aquarium sync errors");
		expect(state?.errors).toEqual([]);
	});
});
