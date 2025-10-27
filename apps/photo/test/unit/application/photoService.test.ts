import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const setMock = vi.fn();
const uploadedDocMock = vi.fn(() => ({
	set: setMock,
}));
const uploadedCollectionMock = vi.fn(() => ({
	doc: uploadedDocMock,
	get: vi.fn(),
}));
const boothDocMock = vi.fn(() => ({
	collection: uploadedCollectionMock,
}));
const collectionMock = vi.fn(() => ({
	doc: boothDocMock,
}));

const whereGetMock = vi.fn();
const limitMock = vi.fn(() => ({
	get: whereGetMock,
}));
const whereMock = vi.fn(() => ({
	limit: limitMock,
}));
const collectionGroupMock = vi.fn(() => ({
	where: whereMock,
}));

const saveMock = vi.fn(() => Promise.resolve());
const storageDeleteMock = vi.fn(() => Promise.resolve());
const fileMock = vi.fn(() => ({
	save: saveMock,
	delete: storageDeleteMock,
}));

const bucket = {
	name: "photo-test.appspot.com",
	file: fileMock,
};

vi.mock("@/lib/firebase/admin", () => ({
	getAdminFirestore: () => ({
		collection: collectionMock,
		collectionGroup: collectionGroupMock,
	}),
	getAdminStorage: () => ({
		bucket: () => bucket,
	}),
}));

const serverTimestampMock = vi.fn(() => "server-timestamp");

vi.mock("firebase-admin/firestore", () => ({
	FieldValue: {
		serverTimestamp: serverTimestampMock,
	},
}));

describe("PhotoService", () => {
	beforeEach(() => {
		setMock.mockReset();
		uploadedDocMock.mockClear();
		uploadedCollectionMock.mockClear();
		boothDocMock.mockClear();
		collectionMock.mockClear();
		saveMock.mockReset();
		storageDeleteMock.mockReset();
		fileMock.mockClear();
		serverTimestampMock.mockClear();
		whereMock.mockClear();
		whereGetMock.mockReset();
	});

	afterEach(() => {
		collectionGroupMock.mockReset();
	});

	it("uploadUserPhoto stores image and metadata", async () => {
		const { uploadUserPhoto } = await import("@/application/photoService");

		const file = new File([new Uint8Array([1, 2, 3])], "visitor.png", {
			type: "image/png",
		});
		Object.defineProperty(file, "arrayBuffer", {
			value: () =>
				Promise.resolve(new Uint8Array([1, 2, 3]).buffer),
		});

		const result = await uploadUserPhoto("booth-1", file);

		expect(fileMock).toHaveBeenCalledWith(expect.stringMatching(/^photos\/.+\/photo\.png$/));
		expect(saveMock).toHaveBeenCalledWith(
			expect.any(Buffer),
			expect.objectContaining({
				contentType: "image/png",
			}),
		);

		expect(collectionMock).toHaveBeenCalledWith("booths");
		expect(boothDocMock).toHaveBeenCalledWith("booth-1");
		expect(uploadedCollectionMock).toHaveBeenCalledWith("uploadedPhotos");

		const callArgs = uploadedDocMock.mock.calls[0] as unknown[];
		const docId = callArgs[0] as string;
		expect(docId).toBeTruthy();
		expect(setMock).toHaveBeenCalledWith({
			boothId: "booth-1",
			photoId: docId,
			imagePath: `photos/${docId}/photo.png`,
			imageUrl: `https://storage.googleapis.com/${bucket.name}/photos/${docId}/photo.png`,
			createdAt: "server-timestamp",
		});

		expect(result.photoId).toBe(docId);
		expect(result.imagePath).toBe(`photos/${docId}/photo.png`);
		expect(result.imageUrl).toBe(
			`https://storage.googleapis.com/${bucket.name}/photos/${docId}/photo.png`,
		);
	});

	it("uploadCapturedPhoto reuses upload logic", async () => {
		const { uploadCapturedPhoto } = await import("@/application/photoService");

		const file = new File([new Uint8Array([4, 5, 6])], "capture.png", {
			type: "image/png",
		});
		Object.defineProperty(file, "arrayBuffer", {
			value: () =>
				Promise.resolve(new Uint8Array([4, 5, 6]).buffer),
		});

		const result = await uploadCapturedPhoto("booth-2", file);

		expect(result.photoId).toBeTruthy();
		expect(saveMock).toHaveBeenCalled();
		expect(setMock).toHaveBeenCalled();
	});

	it("getUploadedPhotos returns stored documents", async () => {
		const fakeDocs = [
			{
				id: "photo-1",
				data: () => ({
					boothId: "booth-3",
					imagePath: "photos/photo-1/photo.png",
					imageUrl: "https://example.com/photo-1.png",
				}),
			},
			{
				id: "photo-2",
				data: () => ({
					boothId: "booth-3",
					imagePath: "photos/photo-2/photo.png",
					imageUrl: "https://example.com/photo-2.png",
				}),
			},
		];

		uploadedCollectionMock.mockReturnValueOnce({
			doc: uploadedDocMock,
			get: vi.fn(() => Promise.resolve({ docs: fakeDocs })),
		});

		const { getUploadedPhotos } = await import("@/application/photoService");

		const result = await getUploadedPhotos("booth-3");

		expect(result).toEqual([
			{
				photoId: "photo-1",
				imagePath: "photos/photo-1/photo.png",
				imageUrl: "https://example.com/photo-1.png",
			},
			{
				photoId: "photo-2",
				imagePath: "photos/photo-2/photo.png",
				imageUrl: "https://example.com/photo-2.png",
			},
		]);
	});

	it("deleteUsedPhoto removes Firestore doc and storage file", async () => {
		const deleteDocMock = vi.fn(() => Promise.resolve());
		whereGetMock.mockResolvedValueOnce({
			empty: false,
			docs: [
				{
					ref: {
						delete: deleteDocMock,
					},
					data: () => ({
						imagePath: "photos/photo-99/photo.png",
					}),
				},
			],
		});

		const { deleteUsedPhoto } = await import("@/application/photoService");

		await deleteUsedPhoto("photo-99");

		expect(collectionGroupMock).toHaveBeenCalledWith("uploadedPhotos");
		expect(whereMock).toHaveBeenCalledWith("photoId", "==", "photo-99");
		expect(limitMock).toHaveBeenCalledWith(1);
		expect(deleteDocMock).toHaveBeenCalled();
		expect(fileMock).toHaveBeenCalledWith("photos/photo-99/photo.png");
		expect(storageDeleteMock).toHaveBeenCalled();
	});
});
