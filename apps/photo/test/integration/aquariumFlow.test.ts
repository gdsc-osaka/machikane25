/**
 * T505 [P] [US3] Integration Test (Aquarium Sync Flow)
 *
 * Validates GenerationService.sendToAquarium error handling
 * and retryAquariumSyncAction success path with mocked Aquarium API.
 *
 * @vitest-environment node
 */

import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import {
	afterAll,
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

const captureExceptionMock = vi.fn();
const findGeneratedPhotoByPhotoIdMock = vi.fn();
const storageBucketMock = vi.fn();

vi.mock("@sentry/nextjs", () => ({
	captureException: captureExceptionMock,
}));

vi.mock("@/infra/firebase/photoRepository", async () => {
	const actual = await vi.importActual<
		typeof import("@/infra/firebase/photoRepository")
	>("@/infra/firebase/photoRepository");
	return {
		...actual,
		findGeneratedPhotoByPhotoId: findGeneratedPhotoByPhotoIdMock,
	};
});

vi.mock("@/infra/gemini/storage", async () => {
	const actual = await vi.importActual<typeof import("@/infra/gemini/storage")>(
		"@/infra/gemini/storage",
	);
	return {
		...actual,
		storageBucket: storageBucketMock,
	};
});

const callState = { count: 0 };

const aquariumServer = setupServer(
	http.post(
		"https://aquarium.example.com/upload-photo",
		async ({ request }: { request: Request }) => {
			const apiKey = request.headers.get("X-API-KEY");
			expect(apiKey).toBe("test-api-key");

			const formData = await request.formData();
			const photoFile = formData.get("photo");
			expect(photoFile).toBeInstanceOf(File);

			callState.count += 1;

			if (callState.count === 1) {
				return new HttpResponse("Aquarium maintenance", {
					status: 500,
					statusText: "Internal Server Error",
				});
			}

			return HttpResponse.json({ status: "ok" }, { status: 200 });
		},
	),
);

const originalAquariumEnv = {
	baseUrl: process.env.AQUARIUM_API_BASE_URL,
	apiKey: process.env.AQUARIUM_API_KEY,
};

const restoreAquariumEnv = () => {
	if (typeof originalAquariumEnv.baseUrl === "string") {
		process.env.AQUARIUM_API_BASE_URL = originalAquariumEnv.baseUrl;
	} else {
		delete process.env.AQUARIUM_API_BASE_URL;
	}

	if (typeof originalAquariumEnv.apiKey === "string") {
		process.env.AQUARIUM_API_KEY = originalAquariumEnv.apiKey;
	} else {
		delete process.env.AQUARIUM_API_KEY;
	}
};

describe("Aquarium Sync Flow", () => {
	beforeAll(() => {
		aquariumServer.listen();
	});

	beforeEach(() => {
		callState.count = 0;
		captureExceptionMock.mockReset();
		findGeneratedPhotoByPhotoIdMock.mockReset();
		storageBucketMock.mockReset();

		// Mock Firebase Storage
		const mockFile = {
			download: vi.fn().mockResolvedValue([Buffer.from("fake-image-data")]),
		};
		storageBucketMock.mockReturnValue({
			file: vi.fn().mockReturnValue(mockFile),
		});

		process.env.AQUARIUM_API_BASE_URL = "https://aquarium.example.com";
		process.env.AQUARIUM_API_KEY = "test-api-key";
		vi.resetModules();
	});

	afterEach(() => {
		restoreAquariumEnv();
	});

	afterAll(() => {
		aquariumServer.close();
	});

	it("captures failure via Sentry and retries successfully through admin action", async () => {
		const generatedPhoto = {
			boothId: "booth-42",
			photoId: "photo-777",
			imageUrl: "https://storage.example.com/photos/booth-42/photo-777.png",
			imagePath: "booths/booth-42/generatedPhotos/photo-777",
			createdAt: new Date("2025-01-01T10:00:00.000Z"),
		};

		const { sendToAquarium } = await import("@/application/generationService");

		await expect(sendToAquarium(generatedPhoto)).rejects.toThrowError(
			"Aquarium sync failed with status 500",
		);

		expect(captureExceptionMock).toHaveBeenCalledTimes(1);
		expect(captureExceptionMock.mock.calls[0]?.[1]).toMatchObject({
			extra: {
				boothId: "booth-42",
				photoId: "photo-777",
			},
		});

		findGeneratedPhotoByPhotoIdMock.mockResolvedValue(generatedPhoto);

		const { retryAquariumSyncAction } = await import(
			"@/app/actions/adminActions"
		);

		const result = await retryAquariumSyncAction({
			eventId: "evt-777",
			photoId: "photo-777",
			issueUrl: "https://sentry.example.com/issues/evt-777",
		});

		expect(result).toEqual({
			eventId: "evt-777",
			photoId: "photo-777",
			status: "success",
			retriedAt: expect.any(String),
			issueUrl: "https://sentry.example.com/issues/evt-777",
		});

		expect(captureExceptionMock).toHaveBeenCalledTimes(1);
		expect(callState.count).toBe(2);
	});
});
