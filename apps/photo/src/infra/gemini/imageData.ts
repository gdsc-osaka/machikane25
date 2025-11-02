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

export const fetchFromStorage = async (
	path: string,
): Promise<StorageDownloadResult> => {
	console.log(`[fetchFromStorage] Downloading file from path: ${path}`);
	const bucket = resolveBucket();
	const bucketName = bucket.name;
	console.log(`[fetchFromStorage] Using bucket: ${bucketName}`);
	const file = bucket.file(path);

	try {
		const [buffer] = await file.download();
		console.log(
			`[fetchFromStorage] Successfully downloaded file, size: ${buffer.length} bytes`,
		);
		const [metadata] = await file.getMetadata().catch(() => [null]);
		const mimeType =
			readStringField(metadata, "contentType") ?? inferMimeTypeFromPath(path);
		console.log(`[fetchFromStorage] File mimeType: ${mimeType}`);

		return { buffer, mimeType };
	} catch (error) {
		console.error(
			`[fetchFromStorage] Failed to download file from path: ${path}`,
			error,
		);
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
	try {
		console.log(`[getUploadedPhotoImage] Fetching photo with id: ${photoId}`);
		const snapshot = await queryUploadedPhotosByPhotoId(photoId).get();
		console.log(
			`[getUploadedPhotoImage] Query returned ${snapshot.docs.length} documents`,
		);

		const firstDoc = snapshot.docs[0];
		if (!firstDoc) {
			console.log(
				`[getUploadedPhotoImage] No document found for photoId: ${photoId}`,
			);
			return null;
		}
		const data = firstDoc.data();
		console.log(`[getUploadedPhotoImage] Document data:`, {
			hasImagePath: !!data.imagePath,
			hasImageUrl: !!data.imageUrl,
			documentId: firstDoc.id,
		});

		// Try imagePath first (works better with emulator and Storage SDK)
		const imagePath = readStringField(data, "imagePath");
		if (imagePath) {
			console.log(
				`[getUploadedPhotoImage] Fetching from storage path: ${imagePath}`,
			);
			const { buffer, mimeType } = await fetchFromStorage(imagePath);
			return {
				mimeType,
				data: buffer.toString("base64"),
			};
		}

		// Fallback to imageUrl
		const imageUrl = readStringField(data, "imageUrl");
		if (imageUrl) {
			console.log(`[getUploadedPhotoImage] Fetching from URL: ${imageUrl}`);
			return fetchFromUrl(imageUrl);
		}

		console.log(
			`[getUploadedPhotoImage] No imagePath or imageUrl found for photoId: ${photoId}`,
		);
		return null;
	} catch (error) {
		console.error(
			`[(getUploadedPhotoImage)] Error fetching uploaded photo image for photoId ${photoId}:`,
			JSON.stringify(error),
		);
		// Re-throw the error to propagate it up and provide better debugging
		throw error;
	}
};

const getOptionImage = async (optionId: string): Promise<ImageData | null> => {
	try {
		console.log(`[getOptionImage] Fetching option with id: ${optionId}`);
		const firestore = getAdminFirestore();
		const snapshot = await firestore.collection("options").doc(optionId).get();

		if (!snapshot.exists) {
			console.log(
				`[getOptionImage] Option document does not exist: ${optionId}`,
			);
			return null;
		}

		const data = snapshot.data();
		if (!data) {
			console.log(`[getOptionImage] Option document has no data: ${optionId}`);
			return null;
		}
		console.log(`[getOptionImage] Option data:`, {
			hasImagePath: !!data.imagePath,
			hasImageUrl: !!data.imageUrl,
		});

		// Try imagePath first (works better with emulator and Storage SDK)
		const imagePath = readStringField(data, "imagePath");
		if (imagePath) {
			console.log(`[getOptionImage] Fetching from storage path: ${imagePath}`);
			const { buffer, mimeType } = await fetchFromStorage(imagePath);
			return {
				mimeType,
				data: buffer.toString("base64"),
			};
		}

		// Fallback to imageUrl
		const imageUrl = readStringField(data, "imageUrl");
		if (imageUrl) {
			console.log(`[getOptionImage] Fetching from URL: ${imageUrl}`);
			return fetchFromUrl(imageUrl);
		}

		console.log(
			`[getOptionImage] No imagePath or imageUrl found for optionId: ${optionId}`,
		);
		return null;
	} catch (error) {
		console.error(
			`[getOptionImage] Error fetching option image for optionId ${optionId}:`,
			error,
		);
		throw error;
	}
};

export const getImageDataFromId = async (id: string): Promise<ImageData> => {
	console.log(`[getImageDataFromId] Starting fetch for id: ${id}`);

	try {
		const uploadedPhoto = await getUploadedPhotoImage(id);
		if (uploadedPhoto) {
			console.log(`[getImageDataFromId] Found uploaded photo for id: ${id}`);
			return uploadedPhoto;
		}

		const optionImage = await getOptionImage(id);
		if (optionImage) {
			console.log(`[getImageDataFromId] Found option image for id: ${id}`);
			return optionImage;
		}

		console.error(`[getImageDataFromId] Image data not found for id: ${id}`);
		throw new Error(`Image data not found for id: ${id}`);
	} catch (error) {
		console.error(
			`[getImageDataFromId] Failed to fetch image data for id: ${id}`,
			error,
		);
		throw error;
	}
};
