/**
 * T306 [US1] Application: PhotoService
 *
 * Handles Storage uploads and Firestore metadata for uploaded photos.
 */

import { Buffer } from "node:buffer";
import { ulid } from "ulid";
import {
	createUploadedPhoto,
	deleteUploadedPhotoByDocumentPath,
	fetchUploadedPhotos,
	queryUploadedPhotosByPhotoId,
} from "@/infra/firebase/photoRepository";
import { getAdminStorage } from "@/lib/firebase/admin";

export type UploadedPhotoMetadata = {
	photoId: string;
	imagePath: string;
	imageUrl: string;
};

const storageBucket = () => {
	const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
	return getAdminStorage().bucket(bucketName);
};

const createPhotoId = (): string => ulid().toLowerCase();

const createImagePath = (photoId: string): string =>
	["photos", photoId, "photo.png"].join("/");

const createImageUrl = (imagePath: string): string => {
	const bucket = storageBucket();
	const bucketName = bucket.name;

	// Check if running in emulator environment
	const storageEmulatorHost = process.env.FIREBASE_STORAGE_EMULATOR_HOST;

	if (storageEmulatorHost) {
		// Emulator URL format: http://localhost:11004/v0/b/bucket-name/o/path?alt=media
		const encodedPath = encodeURIComponent(imagePath);
		return `http://${storageEmulatorHost}/v0/b/${bucketName}/o/${encodedPath}?alt=media`;
	}

	// Production URL format: https://storage.googleapis.com/bucket-name/path
	return `https://storage.googleapis.com/${bucketName}/${imagePath}`;
};

const saveImageToStorage = async (
	imagePath: string,
	file: File,
): Promise<void> => {
	try {
		const bucket = storageBucket();
		const storageFile = bucket.file(imagePath);
		const arrayBuffer = await file.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);

		console.log(`[photoService] Uploading file to Storage: ${imagePath}`);

		await storageFile.save(buffer, {
			resumable: false,
			contentType: file.type,
			metadata: {
				cacheControl: "public,max-age=3600",
			},
			validation: false,
		});

		console.log(
			`[photoService] Successfully uploaded file to Storage: ${imagePath}`,
		);
	} catch (error) {
		console.error(
			`[photoService] Failed to upload file to Storage: ${imagePath}`,
			error,
		);
		throw error;
	}
};

const storeUploadedPhotoDocument = async (
	boothId: string,
	metadata: UploadedPhotoMetadata,
) => {
	const { photoId, imagePath, imageUrl } = metadata;
	await createUploadedPhoto({
		boothId,
		photoId,
		imagePath,
		imageUrl,
	});
};

const uploadPhoto = async (
	boothId: string,
	file: File,
): Promise<UploadedPhotoMetadata> => {
	const photoId = createPhotoId();
	const imagePath = createImagePath(photoId);

	console.log(
		`[photoService] Starting photo upload for booth ${boothId}, photoId: ${photoId}`,
	);

	try {
		// First, upload to Storage
		await saveImageToStorage(imagePath, file);

		// Only after successful Storage upload, save metadata to Firestore
		const imageUrl = createImageUrl(imagePath);
		await storeUploadedPhotoDocument(boothId, {
			photoId,
			imagePath,
			imageUrl,
		});

		console.log(`[photoService] Successfully uploaded photo: ${photoId}`);

		return { photoId, imagePath, imageUrl } satisfies UploadedPhotoMetadata;
	} catch (error) {
		console.error(`[photoService] Failed to upload photo: ${photoId}`, error);

		// Try to clean up the Storage file if Firestore save failed
		try {
			const bucket = storageBucket();
			await bucket
				.file(imagePath)
				.delete()
				.catch(() => undefined);
		} catch (cleanupError) {
			console.error(
				`[photoService] Failed to cleanup Storage file: ${imagePath}`,
				cleanupError,
			);
		}

		throw error;
	}
};

export const uploadUserPhoto = async (
	boothId: string,
	file: File,
): Promise<UploadedPhotoMetadata> => uploadPhoto(boothId, file);

export const uploadCapturedPhoto = async (
	boothId: string,
	file: File,
): Promise<UploadedPhotoMetadata> => uploadPhoto(boothId, file);

export const getUploadedPhotos = async (
	boothId: string,
): Promise<UploadedPhotoMetadata[]> => {
	const photos = await fetchUploadedPhotos(boothId);

	return photos.map((photo) => ({
		photoId: photo.photoId,
		imagePath: photo.imagePath,
		imageUrl: photo.imageUrl,
	}));
};

export const deleteUsedPhoto = async (photoId: string): Promise<void> => {
	const querySnapshot = await queryUploadedPhotosByPhotoId(photoId).get();

	if (querySnapshot.empty) {
		return;
	}

	const [docSnapshot] = querySnapshot.docs;
	const data = docSnapshot.data();

	const imagePathValue =
		data && typeof data.imagePath === "string" ? data.imagePath : null;

	await deleteUploadedPhotoByDocumentPath(docSnapshot.ref.path);

	if (imagePathValue) {
		await storageBucket()
			.file(imagePathValue)
			.delete()
			.catch(() => undefined);
	}
};
