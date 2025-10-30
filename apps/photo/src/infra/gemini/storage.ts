import type { Buffer } from "node:buffer";
import { ulid } from "ulid";
import { getAdminStorage } from "@/lib/firebase/admin";

type GeminiUploadResult = {
	imagePath: string;
	imageUrl: string;
};

const resolveBucketName = (): string | undefined => {
	const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
	if (bucketName && bucketName.length > 0) {
		return bucketName;
	}
	return undefined;
};

export const storageBucket = () => {
	const storage = getAdminStorage();
	const bucketName = resolveBucketName();
	if (bucketName) {
		return storage.bucket(bucketName);
	}
	return storage.bucket();
};

const toExtension = (mimeType: string): string => {
	if (mimeType === "image/jpeg") {
		return "jpg";
	}
	if (mimeType === "image/webp") {
		return "webp";
	}
	return "png";
};

const createImagePath = (
	boothId: string,
	generatedId: string,
	extension: string,
): string =>
	["generated_photos", boothId, generatedId, `photo.${extension}`].join("/");

const createPublicUrl = (bucketName: string, imagePath: string): string => {
	const emulatorHost = process.env.FIREBASE_STORAGE_EMULATOR_HOST;
	if (emulatorHost) {
		const encodedPath = encodeURIComponent(imagePath);
		return `http://${emulatorHost}/v0/b/${bucketName}/o/${encodedPath}?alt=media`;
	}
	return `https://storage.googleapis.com/${bucketName}/${imagePath}`;
};

export const handleGeminiResponse = async (
	imageBuffer: Buffer,
	boothId: string,
	mimeType: string,
): Promise<GeminiUploadResult> => {
	const bucket = storageBucket();
	const generatedId = ulid().toLowerCase();
	const extension = toExtension(mimeType);
	const imagePath = createImagePath(boothId, generatedId, extension);
	const file = bucket.file(imagePath);

	await file.save(imageBuffer, {
		resumable: false,
		contentType: mimeType,
		metadata: {
			cacheControl: "public,max-age=3600",
		},
		validation: false,
	});

	const publicUrl = createPublicUrl(bucket.name, imagePath);

	return {
		imagePath,
		imageUrl: publicUrl,
	};
};
