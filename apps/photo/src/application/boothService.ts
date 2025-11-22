/**
 * T305 [US1] Application: BoothService
 *
 * Orchestrates booth state transitions using Firebase Admin SDK.
 */

import { Buffer } from "node:buffer";
import { FieldValue } from "firebase-admin/firestore";
import { ulid } from "ulid";
import { type BoothState, ensureValidBoothState } from "@/domain/booth";
import {
	GEMINI_FLASH_IMAGE_MODEL_ID,
	GEMINI_PRO_IMAGE_MODEL_ID,
} from "@/domain/models";
import { createGeneratedPhoto } from "@/infra/firebase/photoRepository";
import { getAdminFirestore, getAdminStorage } from "@/lib/firebase/admin";
import { generateImage, sendToAquarium } from "./generationService";
import { deleteUsedPhoto } from "./photoService";

type BoothStateUpdate = {
	state?: BoothState;
	latestPhotoIds?: string[] | null;
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

export const discardSession = async (boothId: string): Promise<void> => {
	await updateBoothState(boothId, { state: "idle" });
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
	// Generate 3 IDs and create records immediately
	const generatedPhotoIds = [
		ulid().toLowerCase(),
		ulid().toLowerCase(),
		ulid().toLowerCase(),
	];

	await Promise.all(
		generatedPhotoIds.map((photoId) =>
			createGeneratedPhoto({
				boothId,
				photoId,
				imagePath: "", // Will be updated later
				imageUrl: "", // Will be updated later
				status: "generating",
			}),
		),
	);

	await updateBoothState(boothId, {
		state: "generating",
		latestPhotoIds: generatedPhotoIds,
	});
	console.debug(
		"Booth state updated to 'generating' with IDs:",
		generatedPhotoIds,
	);

	// Generate 3 images in parallel
	// 1x Nano Banana Pro (gemini-3-pro-image-preview)
	// 2x Nano Banana (gemini-2.5-flash-image)
	const models = [
		GEMINI_PRO_IMAGE_MODEL_ID,
		GEMINI_FLASH_IMAGE_MODEL_ID,
		GEMINI_FLASH_IMAGE_MODEL_ID,
	];

	const generatePromises = models.map((modelId, index) =>
		generateImage(
			boothId,
			uploadedPhotoId,
			options,
			modelId,
			generatedPhotoIds[index],
		),
	);

	const results = await Promise.allSettled(generatePromises);

	// Check if we should still transition to completed (user might have started new session)
	const currentBooth = await boothsCollection().doc(boothId).get();
	const currentState = currentBooth.data()?.state;

	if (currentState === "generating") {
		const successfulPhotoIds = results
			.map((result, index) =>
				result.status === "fulfilled" ? generatedPhotoIds[index] : null,
			)
			.filter((id): id is string => id !== null);

		if (successfulPhotoIds.length > 0) {
			// Automatically transition to completed state with only successful photos
			await updateBoothState(boothId, {
				state: "completed",
				latestPhotoIds: successfulPhotoIds,
			});
			console.debug(
				"Booth state updated to 'completed' with IDs:",
				successfulPhotoIds,
			);
		} else {
			console.error("All photo generations failed");
			// Optionally transition to a failed state or keep it in generating/menu
			// For now, we'll leave it as is or maybe reset to menu?
			// If we leave it in generating, the user is stuck.
			// Let's reset to menu so they can try again.
			await updateBoothState(boothId, { state: "menu" });
		}
	}

	// Cleanup uploaded photo in the background
	// FIXME: cleanerあるからこれ要らん
	void deleteUsedPhoto(boothId, uploadedPhotoId).catch(() => undefined);
};

export const completeGeneration = async (
	boothId: string,
	generatedPhotoId: string,
	usedUploadedPhotoId: string,
): Promise<void> => {
	await updateBoothState(boothId, {
		state: "completed",
		latestPhotoIds: [generatedPhotoId],
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

	await sendToAquarium({
		boothId,
		photoId: generatedPhotoId,
		imagePath,
		imageUrl,
		status: "completed",
		createdAt: new Date(),
	});

	// Cleanup uploaded photo in the background
	void deleteUsedPhoto(boothId, usedUploadedPhotoId).catch(() => undefined);
};

const SAMPLE_GENERATED_IMAGE_BYTES = [
	0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49,
	0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02,
	0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44,
	0x41, 0x54, 0x08, 0xd7, 0x63, 0x60, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, 0xe2,
	0x26, 0x05, 0x9b, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42,
	0x60, 0x82,
];
