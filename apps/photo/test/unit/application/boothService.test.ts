import { beforeEach, describe, expect, it, vi } from "vitest";

const updateMock = vi.fn();
const storageSaveMock = vi.fn(() => Promise.resolve());
const docMock = vi.fn(() => ({
	update: updateMock,
}));
const collectionMock = vi.fn(() => ({
	doc: docMock,
}));

vi.mock("@/lib/firebase/admin", () => ({
	getAdminFirestore: () => ({
		collection: collectionMock,
	}),
	getAdminStorage: () => ({
		bucket: () => ({
			file: () => ({
				save: storageSaveMock,
				exists: () => Promise.resolve([true]),
			}),
		}),
	}),
}));

const serverTimestampMock = vi.fn(() => "server-timestamp");

vi.mock("firebase-admin/firestore", () => ({
	FieldValue: {
		serverTimestamp: serverTimestampMock,
	},
}));

const generateImageMock = vi.fn(() => Promise.resolve());
vi.mock("@/application/generationService", () => ({
	generateImage: generateImageMock,
}));

const deleteUsedPhotoMock = vi.fn(() => Promise.resolve());
vi.mock("@/application/photoService", () => ({
	deleteUsedPhoto: deleteUsedPhotoMock,
}));

describe("BoothService", () => {
	beforeEach(() => {
		updateMock.mockReset();
		docMock.mockClear();
		collectionMock.mockClear();
		serverTimestampMock.mockClear();
		generateImageMock.mockClear();
		deleteUsedPhotoMock.mockClear();
	});

	it("startSession updates booth state to menu", async () => {
		const { startSession } = await import("@/application/boothService");

		await startSession("booth-1");

		expect(collectionMock).toHaveBeenCalledWith("booths");
		expect(docMock).toHaveBeenCalledWith("booth-1");
		expect(updateMock).toHaveBeenCalledWith({
			state: "menu",
			updatedAt: "server-timestamp",
		});
	});

	it("startCapture updates booth state to capturing with timestamp", async () => {
		const { startCapture } = await import("@/application/boothService");

		await startCapture("booth-2");

		expect(updateMock).toHaveBeenCalledWith({
			state: "capturing",
			lastTakePhotoAt: "server-timestamp",
			updatedAt: "server-timestamp",
		});
		expect(serverTimestampMock).toHaveBeenCalled();
	});

	it("completeCapture resets state back to menu", async () => {
		const { completeCapture } = await import("@/application/boothService");

		await completeCapture("booth-3");

		expect(updateMock).toHaveBeenCalledWith({
			state: "menu",
			updatedAt: "server-timestamp",
		});
	});

	it("startGeneration toggles state and triggers GenerationService", async () => {
		const { startGeneration } = await import("@/application/boothService");

		await startGeneration("booth-4", "uploaded-1", { style: "style-1" });

		expect(updateMock).toHaveBeenCalledWith({
			state: "generating",
			updatedAt: "server-timestamp",
		});
		expect(generateImageMock).toHaveBeenCalledWith("booth-4", "uploaded-1", {
			style: "style-1",
		});
	});

	it("completeGeneration updates state and schedules cleanup", async () => {
		const { completeGeneration } = await import("@/application/boothService");

		await completeGeneration("booth-5", "generated-1", "uploaded-2");

		expect(updateMock).toHaveBeenCalledWith({
			state: "completed",
			latestPhotoId: "generated-1",
			updatedAt: "server-timestamp",
		});
		expect(deleteUsedPhotoMock).toHaveBeenCalledWith("uploaded-2");
	});
});
