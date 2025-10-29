import { beforeEach, describe, expect, it, vi } from "vitest";

const updateMock = vi.fn();
const setMock = vi.fn();
const storageSaveMock = vi.fn(() => Promise.resolve());
const storageFileMock = vi.fn(() => ({
	save: storageSaveMock,
	exists: () => Promise.resolve([true]),
}));
const storageBucketMock = vi.fn(() => ({
	name: "test-bucket",
	file: storageFileMock,
}));
const docMock = vi.fn(() => ({
	update: updateMock,
	set: setMock,
}));
const collectionMock = vi.fn((collectionName: string) => {
	if (collectionName === "booths") {
		return {
			doc: docMock,
		};
	}
	throw new Error(`Unexpected collection requested: ${collectionName}`);
});

vi.mock("@/lib/firebase/admin", () => ({
	getAdminFirestore: () => ({
		collection: collectionMock,
	}),
	getAdminStorage: () => ({
		bucket: storageBucketMock,
	}),
}));

const serverTimestampMock = vi.fn(() => "server-timestamp");

vi.mock("firebase-admin/firestore", () => ({
	FieldValue: {
		serverTimestamp: serverTimestampMock,
	},
}));

const generateImageMock = vi.fn(() => Promise.resolve());
const sendToAquariumMock = vi.fn(() => Promise.resolve());
vi.mock("@/application/generationService", () => ({
	generateImage: generateImageMock,
	sendToAquarium: sendToAquariumMock,
}));

const deleteUsedPhotoMock = vi.fn(() => Promise.resolve());
vi.mock("@/application/photoService", () => ({
	deleteUsedPhoto: deleteUsedPhotoMock,
}));
const createGeneratedPhotoMock = vi.fn(() => Promise.resolve());
vi.mock("@/infra/firebase/photoRepository", () => ({
	createGeneratedPhoto: createGeneratedPhotoMock,
}));

describe("BoothService", () => {
	beforeEach(() => {
		updateMock.mockReset();
		setMock.mockReset();
		createGeneratedPhotoMock.mockReset();
		storageSaveMock.mockReset();
		storageFileMock.mockClear();
		storageBucketMock.mockClear();
		docMock.mockClear();
		collectionMock.mockClear();
	serverTimestampMock.mockClear();
	generateImageMock.mockClear();
	deleteUsedPhotoMock.mockClear();
	sendToAquariumMock.mockClear();
	});

	it("startSession updates booth state to menu", async () => {
		const { startSession } = await import("@/application/boothService");

		await startSession("booth-1");

		expect(collectionMock).toHaveBeenCalledWith("booths");
		expect(docMock).toHaveBeenCalledWith("booth-1");
		expect(setMock).toHaveBeenCalledWith(
			{
				state: "menu",
				updatedAt: "server-timestamp",
			},
			{ merge: true },
		);
	});

	it("startCapture updates booth state to capturing with timestamp", async () => {
		const { startCapture } = await import("@/application/boothService");

		await startCapture("booth-2");

		expect(setMock).toHaveBeenCalledWith(
			{
				state: "capturing",
				lastTakePhotoAt: "server-timestamp",
				updatedAt: "server-timestamp",
			},
			{ merge: true },
		);
		expect(serverTimestampMock).toHaveBeenCalled();
	});

	it("completeCapture resets state back to menu", async () => {
		const { completeCapture } = await import("@/application/boothService");

		await completeCapture("booth-3");

		expect(setMock).toHaveBeenCalledWith(
			{
				state: "menu",
				updatedAt: "server-timestamp",
			},
			{ merge: true },
		);
	});

	it("startGeneration toggles state and triggers GenerationService", async () => {
		const { startGeneration } = await import("@/application/boothService");

		await startGeneration("booth-4", "uploaded-1", { style: "style-1" });

		expect(setMock).toHaveBeenCalledWith(
			{
				state: "generating",
				updatedAt: "server-timestamp",
			},
			{ merge: true },
		);
		expect(generateImageMock).toHaveBeenCalledWith("booth-4", "uploaded-1", {
			style: "style-1",
		});
	});

	it("completeGeneration updates state and schedules cleanup", async () => {
		const { completeGeneration } = await import("@/application/boothService");

		await completeGeneration("booth-5", "generated-1", "uploaded-2");

		// Verify booth state update
		expect(collectionMock).toHaveBeenCalledWith("booths");
		expect(docMock).toHaveBeenCalledWith("booth-5");
		expect(setMock).toHaveBeenCalledWith(
			{
				state: "completed",
				latestPhotoId: "generated-1",
				updatedAt: "server-timestamp",
			},
			{ merge: true },
		);

		// Verify storage file save
		expect(storageFileMock).toHaveBeenCalledWith(
			"generated_photos/generated-1/photo.png",
		);
		expect(storageSaveMock).toHaveBeenCalledWith(expect.any(Buffer), {
			resumable: false,
			contentType: "image/png",
			metadata: {
				cacheControl: "public,max-age=3600",
			},
			validation: false,
		});

		// Verify generated photos stored via subcollection repository
	expect(createGeneratedPhotoMock).toHaveBeenCalledWith({
		boothId: "booth-5",
		photoId: "generated-1",
		imagePath: "generated_photos/generated-1/photo.png",
		imageUrl:
			"http://localhost:11004/v0/b/test-bucket/o/generated_photos%2Fgenerated-1%2Fphoto.png?alt=media",
	});
	expect(collectionMock).not.toHaveBeenCalledWith("generatedPhotos");

	expect(sendToAquariumMock).toHaveBeenCalledWith({
		boothId: "booth-5",
		photoId: "generated-1",
		imagePath: "generated_photos/generated-1/photo.png",
		imageUrl:
			"http://localhost:11004/v0/b/test-bucket/o/generated_photos%2Fgenerated-1%2Fphoto.png?alt=media",
		createdAt: expect.any(Date),
	});

	// Verify cleanup
	expect(deleteUsedPhotoMock).toHaveBeenCalledWith("uploaded-2");
});
});

