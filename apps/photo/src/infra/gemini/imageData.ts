import { Buffer } from "node:buffer";
import { queryUploadedPhotosByPhotoId } from "@/infra/firebase/photoRepository";
import { getAdminFirestore, getAdminStorage } from "@/lib/firebase/admin";

type ImageData = {
	mimeType: string;
	data: string;
};

type StorageDownloadResult = {
	buffer: Buffer;
	mimeType: string;
};

const readStringField = (input: unknown, field: string): string | null => {
	if (typeof input !== "object" || input === null) {
		return null;
	}
	const value = Reflect.get(input, field);
	if (typeof value === "string" && value.length > 0) {
		return value;
	}
	return null;
};

const inferMimeTypeFromPath = (path: string): string => {
	const lowered = path.toLowerCase();
	if (lowered.endsWith(".png")) {
		return "image/png";
	}
	if (lowered.endsWith(".jpg") || lowered.endsWith(".jpeg")) {
		return "image/jpeg";
	}
	if (lowered.endsWith(".webp")) {
		return "image/webp";
	}
	return "application/octet-stream";
};

const resolveBucket = () => {
	const storage = getAdminStorage();
	const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
	if (bucketName) {
		return storage.bucket(bucketName);
	}
	return storage.bucket();
};

const fetchFromStorage = async (
	path: string,
): Promise<StorageDownloadResult> => {
	const bucket = resolveBucket();
	const file = bucket.file(path);

	try {
		const [buffer] = await file.download();
		const [metadata] = await file.getMetadata().catch(() => [null]);
		const mimeType =
			readStringField(metadata, "contentType") ?? inferMimeTypeFromPath(path);

		return { buffer, mimeType };
	} catch (error) {
		throw new Error(`Storage object not found at path: ${path}`);
	}
};

const fetchFromUrl = async (url: string): Promise<ImageData> => {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Failed to fetch image from URL: ${url}`);
	}
	const arrayBuffer = await response.arrayBuffer();
	const buffer = Buffer.from(arrayBuffer);
	const headerMime =
		response.headers.get("content-type") ??
		response.headers.get("Content-Type") ??
		"";
	const mimeType =
		headerMime && headerMime.length > 0
			? headerMime
			: inferMimeTypeFromPath(url);

	return {
		mimeType,
		data: buffer.toString("base64"),
	};
};

const getUploadedPhotoImage = async (
	photoId: string,
): Promise<ImageData | null> => {
	const snapshot = await queryUploadedPhotosByPhotoId(photoId).get();
	const firstDoc = snapshot.docs[0];
	if (!firstDoc) {
		return null;
	}
	const data = firstDoc.data();

	// Try imagePath first (works better with emulator and Storage SDK)
	const imagePath = readStringField(data, "imagePath");
	if (imagePath) {
		const { buffer, mimeType } = await fetchFromStorage(imagePath);
		return {
			mimeType,
			data: buffer.toString("base64"),
		};
	}

	// Fallback to imageUrl
	const imageUrl = readStringField(data, "imageUrl");
	if (imageUrl) {
		return fetchFromUrl(imageUrl);
	}

	return null;
};

const getOptionImage = async (optionId: string): Promise<ImageData | null> => {
	const firestore = getAdminFirestore();
	const snapshot = await firestore.collection("options").doc(optionId).get();
	if (!snapshot.exists) {
		return null;
	}

	const data = snapshot.data();
	if (!data) {
		return null;
	}

	// Try imagePath first (works better with emulator and Storage SDK)
	const imagePath = readStringField(data, "imagePath");
	if (imagePath) {
		const { buffer, mimeType } = await fetchFromStorage(imagePath);
		return {
			mimeType,
			data: buffer.toString("base64"),
		};
	}

	// Fallback to imageUrl
	const imageUrl = readStringField(data, "imageUrl");
	if (imageUrl) {
		return fetchFromUrl(imageUrl);
	}

	return null;
};

export const getImageDataFromId = async (id: string): Promise<ImageData> => {
	const uploadedPhoto = await getUploadedPhotoImage(id);
	if (uploadedPhoto) {
		return uploadedPhoto;
	}

	const optionImage = await getOptionImage(id);
	if (optionImage) {
		return optionImage;
	}

	throw new Error(`Image data not found for id: ${id}`);
};
