import { beforeEach, describe, expect, it, vi } from "vitest";

const { retryAquariumSyncMock, getSyncErrorsMock } = vi.hoisted(() => ({
	retryAquariumSyncMock: vi.fn(),
	getSyncErrorsMock: vi.fn(),
}));

vi.mock("@/application/adminService", () => ({
	retryAquariumSync: retryAquariumSyncMock,
}));

vi.mock("@/application/aquariumService", () => ({
	getSyncErrors: getSyncErrorsMock,
}));

import {
	getAquariumSyncErrorsAction,
	retryAquariumSyncAction,
} from "@/app/actions/adminActions";

describe("admin actions", () => {
	beforeEach(() => {
		retryAquariumSyncMock.mockReset();
		getSyncErrorsMock.mockReset();
	});

	it("parses input and forwards to retryAquariumSync service", async () => {
		const input = {
			eventId: "event-123",
			photoId: "photo-456",
			issueUrl: "https://example.com/issues/1",
		};
		const retryResult = { status: "success" } as const;
		retryAquariumSyncMock.mockResolvedValue(retryResult);

		const result = await retryAquariumSyncAction(input);

		expect(retryAquariumSyncMock).toHaveBeenCalledWith(input);
		expect(result).toBe(retryResult);
	});

	it("rejects invalid retry input", async () => {
		await expect(
			retryAquariumSyncAction({
				eventId: "",
				photoId: "photo-456",
				issueUrl: "not-a-url",
			}),
		).rejects.toThrowError();
	});

	it("returns aquarium sync errors from service", async () => {
		const errors = [
			{
				eventId: "evt",
				photoId: "photo",
				errorMessage: "error",
				issueUrl: "https://example.com/errors/1",
				timestamp: "2025-01-01T00:00:00.000Z",
			},
		];
		getSyncErrorsMock.mockResolvedValue(errors);

		const result = await getAquariumSyncErrorsAction();

		expect(getSyncErrorsMock).toHaveBeenCalledOnce();
		expect(result).toEqual(errors);
	});
});
