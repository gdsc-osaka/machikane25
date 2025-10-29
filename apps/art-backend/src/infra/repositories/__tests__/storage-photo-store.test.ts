import { describe, expect, test } from "vitest";

import { StorageError } from "../../../errors/infrastructure-errors.js";
import { createStoragePhotoStore } from "../storage-photo-store.js";

type SaveOverride = Readonly<{
	save: (
		args: Readonly<{
			path: string;
			buffer: Buffer;
			options: Record<string, unknown>;
		}>,
	) => Promise<void>;
}>;

type SignedUrlOverride = Readonly<{
	getSignedUrl: (
		args: Readonly<{
			path: string;
		}>,
	) => Promise<readonly [string]>;
}>;

type DeleteOverride = Readonly<{
	delete: (
		args: Readonly<{
			path: string;
		}>,
	) => Promise<void>;
}>;

const createStorageStub = (
	overrides?: Partial<SaveOverride & SignedUrlOverride & DeleteOverride>,
) => {
	const uploads = new Map<string, Buffer>();
	const deleted = new Set<string>();

	const saveHandler =
		overrides?.save ??
		(async (params) => {
			uploads.set(params.path, params.buffer);
		});

	const signedUrlHandler =
		overrides?.getSignedUrl ??
		(async (params) => [`https://storage.test/${params.path}`]);

	const deleteHandler =
		overrides?.delete ??
		(async (params) => {
			uploads.delete(params.path);
			deleted.add(params.path);
		});

	const storage = {
		bucket: () =>
			Object.freeze({
				file: (path: string) =>
					Object.freeze({
						save: (buffer: Buffer, options: Record<string, unknown>) =>
							saveHandler({
								path,
								buffer,
								options,
							}),
						getSignedUrl: () => signedUrlHandler({ path }),
						delete: () => deleteHandler({ path }),
					}),
			}),
	};

	return Object.freeze({
		storage,
		uploads,
		deleted,
	});
};

describe("createStoragePhotoStore", () => {
	test("uploads photo and returns image metadata", async () => {
		const stub = createStorageStub();
		const store = createStoragePhotoStore({
			storage: stub.storage,
			bucketName: "bucket",
		});

		const buffer = Buffer.from("blurred");
		const result = await store.upload({
			id: "fish-1",
			buffer,
			mimeType: "image/png",
		});

		expect(result).toEqual({
			imageUrl: "https://storage.test/fish_images/fish-1/fish.png",
			imagePath: "fish_images/fish-1/fish.png",
		});
		expect(stub.uploads.get("fish_images/fish-1/fish.png")).toEqual(buffer);
	});

	test("wraps upload failures in StorageError", async () => {
		const stub = createStorageStub({
			save: async () => {
				throw new Error("upload failed");
			},
		});
		const store = createStoragePhotoStore({
			storage: stub.storage,
			bucketName: "bucket",
		});

		const buffer = Buffer.from("broken");
		await expect(
			store.upload({
				id: "fish-bad",
				buffer,
				mimeType: "image/png",
			}),
		).rejects.toThrow(StorageError);
		expect(stub.uploads.size).toBe(0);
	});

	test("cleans up file when signed URL generation fails", async () => {
		const stub = createStorageStub({
			getSignedUrl: async () => {
				throw new Error("signed url failed");
			},
		});
		const store = createStoragePhotoStore({
			storage: stub.storage,
			bucketName: "bucket",
		});

		const buffer = Buffer.from("cleanup");
		await expect(
			store.upload({
				id: "fish-cleanup",
				buffer,
				mimeType: "image/png",
			}),
		).rejects.toThrow(StorageError);

		const path = "fish_images/fish-cleanup/fish.png";
		expect(stub.deleted.has(path)).toBe(true);
	});
});
