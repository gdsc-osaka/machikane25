import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const originalEnv = { ...process.env };

import {
	getSyncErrors,
	mapSentryIssueToSyncError,
} from "@/application/aquariumService";

describe("aquariumService.mapSentryIssueToSyncError", () => {
	it("returns null when photoId tag is missing", () => {
		const issue = {
			id: "1",
			title: "Missing photo",
			tags: [{ key: "boothId", value: "booth-1" }],
		};

		expect(mapSentryIssueToSyncError(issue)).toBeNull();
	});

	it("maps sentry issue into sync error structure", () => {
		const issue = {
			eventID: "evt-1",
			permalink: "https://sentry.example.com/issues/1",
			title: "Upload failed",
			lastSeen: "2025-01-01T10:00:00Z",
			tags: [
				{ key: "photoId", value: "photo-1" },
				{ key: "boothId", value: "booth-1" },
			],
			latestEvent: {
				eventID: "evt-2",
				dateCreated: "2025-01-01T11:00:00Z",
				tags: [{ key: "photoId", value: "photo-1" }],
			},
			metadata: {
				value: "Upload API returned 500",
			},
		};

		expect(mapSentryIssueToSyncError(issue)).toEqual({
			eventId: "evt-1",
			photoId: "photo-1",
			errorMessage: "Upload API returned 500",
			timestamp: "2025-01-01T11:00:00.000Z",
			issueUrl: "https://sentry.example.com/issues/1",
		});
	});
});

describe("aquariumService.getSyncErrors", () => {
	const fetchMock = vi.fn();

	beforeEach(() => {
		process.env = {
			...originalEnv,
			SENTRY_AQUARIUM_ENDPOINT: "https://sentry.example.com/api/0/issues/",
			SENTRY_API_TOKEN: "token-123",
		};
		global.fetch = fetchMock as unknown as typeof fetch;
		fetchMock.mockReset();
	});

	afterEach(() => {
		process.env = { ...originalEnv };
		Reflect.deleteProperty(global, "fetch");
	});

	it("fetches and maps sync errors", async () => {
		const issues = [
			{
				eventID: "evt-1",
				permalink: "https://sentry.example.com/issues/1",
				tags: [{ key: "photoId", value: "photo-1" }],
			},
		];
		fetchMock.mockResolvedValue({
			ok: true,
			json: async () => issues,
		});

		const result = await getSyncErrors();

		expect(fetchMock).toHaveBeenCalledWith(
			"https://sentry.example.com/api/0/issues/",
			{
				method: "GET",
				headers: {
					Authorization: "Bearer token-123",
					Accept: "application/json",
				},
			},
		);
		expect(result).toEqual([
			{
				eventId: "evt-1",
				photoId: "photo-1",
				errorMessage: "Aquarium sync failed",
				timestamp: "1970-01-01T00:00:00.000Z",
				issueUrl: "https://sentry.example.com/issues/1",
			},
		]);
	});

	it("throws when sentry env is missing", async () => {
		delete process.env.SENTRY_AQUARIUM_ENDPOINT;

		await expect(getSyncErrors()).rejects.toThrowError(
			"Sentry Aquarium endpoint or token is not configured",
		);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("throws when fetch response is not ok", async () => {
		fetchMock.mockResolvedValue({
			ok: false,
			status: 500,
		});

		await expect(getSyncErrors()).rejects.toThrowError(
			"Failed to fetch aquarium sync errors: 500",
		);
	});
});

