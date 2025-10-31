import type { Storage } from "firebase-admin/storage";

import type { PhotoStorage } from "../../application/ports.js";
import { StorageError } from "../../errors/infrastructure-errors.js";

const IMAGE_FILE_NAME = "fish.png";
const IMAGE_FOLDER = "fish_images";
const SIGNED_URL_TTL_MS = 1000 * 60 * 60 * 24;

const toPath = (id: string) => `${IMAGE_FOLDER}/${id}/${IMAGE_FILE_NAME}`;

export type StorageDeps = Readonly<{
	storage: Storage;
	bucketName: string;
}>;

export const createStoragePhotoStore = (deps: StorageDeps): PhotoStorage => {
	const upload: PhotoStorage["upload"] = async (args) => {
		const bucket = deps.storage.bucket(deps.bucketName);
		const path = toPath(args.id);
		const file = bucket.file(path);
		try {
			await file.save(args.buffer, {
				contentType: args.mimeType,
				resumable: false,
				metadata: {
					cacheControl: "public, max-age=0, no-store",
				},
			});
		} catch (error) {
			throw new StorageError({
				message: "Failed to upload fish image",
				code: "STORAGE_UPLOAD_FAILED",
				context: { id: args.id, path },
				cause: error,
			});
		}

		try {
			const [signedUrl] = await file.getSignedUrl({
				action: "read",
				expires: new Date(Date.now() + SIGNED_URL_TTL_MS).toISOString(),
			});
			return Object.freeze({
				imageUrl: signedUrl,
				imagePath: path,
			});
		} catch (error) {
			try {
				await file.delete();
			} catch {
				// ignore cleanup failure
			}

			throw new StorageError({
				message: "Failed to generate image URL",
				code: "STORAGE_SIGNED_URL_FAILED",
				context: { id: args.id, path },
				cause: error,
			});
		}
	};

	return Object.freeze({
		upload,
	});
};
