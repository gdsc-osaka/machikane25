/**
 * T305 [US1] Application: BoothService
 *
 * Orchestrates booth state transitions using Firebase Admin SDK.
 */

import { Buffer } from "node:buffer";
import { FieldValue } from "firebase-admin/firestore";
import { type BoothState, ensureValidBoothState } from "@/domain/booth";
import { createGeneratedPhoto } from "@/infra/firebase/photoRepository";
import { getAdminFirestore, getAdminStorage } from "@/lib/firebase/admin";
import { generateImage } from "./generationService";
import { deleteUsedPhoto } from "./photoService";

type BoothStateUpdate = {
	state?: BoothState;
	latestPhotoId?: string | null;
	lastTakePhotoAt?: unknown;
};

const boothsCollection = () => getAdminFirestore().collection("booths");
const storageBucket = () => {
	const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
	return getAdminStorage().bucket(bucketName);
};

const withTimestamps = (data: BoothStateUpdate) => ({
	...data,
	updatedAt: FieldValue.serverTimestamp(),
});

const updateBoothState = async (boothId: string, update: BoothStateUpdate) => {
	ensureValidBoothState(update.state);

	const docRef = boothsCollection().doc(boothId);
	await docRef.set(withTimestamps(update), { merge: true });
};

export const startSession = async (boothId: string): Promise<void> => {
	await updateBoothState(boothId, { state: "menu" });
};

export const startCapture = async (boothId: string): Promise<void> => {
	await updateBoothState(boothId, {
		state: "capturing",
		lastTakePhotoAt: FieldValue.serverTimestamp(),
	});
};

export const completeCapture = async (boothId: string): Promise<void> => {
	await updateBoothState(boothId, { state: "menu" });
};

export const startGeneration = async (
	boothId: string,
	uploadedPhotoId: string,
	options: Record<string, string>,
): Promise<void> => {
	await updateBoothState(boothId, { state: "generating" });

	// Kick off generation asynchronously (non-blocking for caller)
	void generateImage(boothId, uploadedPhotoId, options).catch(() => undefined);
};

export const completeGeneration = async (
	boothId: string,
	generatedPhotoId: string,
	usedUploadedPhotoId: string,
): Promise<void> => {
	await updateBoothState(boothId, {
		state: "completed",
		latestPhotoId: generatedPhotoId,
	});

	const bucket = storageBucket();
	const imagePath = ["generated_photos", generatedPhotoId, "photo.png"].join(
		"/",
	);

	await bucket.file(imagePath).save(Buffer.from(SAMPLE_GENERATED_IMAGE_BYTES), {
		resumable: false,
		contentType: "image/png",
		metadata: {
			cacheControl: "public,max-age=3600",
		},
		validation: false,
	});

	// Generate URL based on environment (emulator or production)
	const storageEmulatorHost = process.env.FIREBASE_STORAGE_EMULATOR_HOST;
	let imageUrl: string;

	if (storageEmulatorHost) {
		// Emulator URL format
		const encodedPath = encodeURIComponent(imagePath);
		imageUrl = `http://${storageEmulatorHost}/v0/b/${bucket.name}/o/${encodedPath}?alt=media`;
	} else {
		// Production URL format
		imageUrl = `https://storage.googleapis.com/${bucket.name}/${imagePath}`;
	}

	await createGeneratedPhoto({
		boothId,
		photoId: generatedPhotoId,
		imagePath,
		imageUrl,
	});

	// Cleanup uploaded photo in the background
	void deleteUsedPhoto(usedUploadedPhotoId).catch(() => undefined);
};

const SAMPLE_GENERATED_IMAGE_BYTES = [
	0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49,
	0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02,
	0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44,
	0x41, 0x54, 0x08, 0xd7, 0x63, 0x60, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, 0xe2,
	0x26, 0x05, 0x9b, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42,
	0x60, 0x82,
];
