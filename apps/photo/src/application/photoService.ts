/**
 * T306 [US1] Application: PhotoService
 *
 * Handles Storage uploads and Firestore metadata for uploaded photos.
 */

import { FieldValue } from "firebase-admin/firestore";
import { ulid } from "ulid";
import { Buffer } from "node:buffer";
import { getAdminFirestore, getAdminStorage } from "@/lib/firebase/admin";

type UploadedPhotoMetadata = {
	photoId: string;
	imagePath: string;
	imageUrl: string;
};

const boothsCollection = () => getAdminFirestore().collection("booths");

const uploadedPhotosCollection = (boothId: string) =>
	boothsCollection().doc(boothId).collection("uploadedPhotos");

const storageBucket = () => {
	const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
	return getAdminStorage().bucket(bucketName);
};

const createPhotoId = (): string => ulid().toLowerCase();

const createImagePath = (photoId: string): string => `photos/${photoId}/photo.png`;

const createImageUrl = (imagePath: string): string => {
	const bucket = storageBucket();
	return `https://storage.googleapis.com/${bucket.name}/${imagePath}`;
};

const saveImageToStorage = async (imagePath: string, file: File) => {
	const storageFile = storageBucket().file(imagePath);
	const arrayBuffer = await file.arrayBuffer();
	const buffer = Buffer.from(arrayBuffer);

	await storageFile.save(buffer, {
		resumable: false,
		contentType: file.type,
		metadata: {
			cacheControl: "public,max-age=3600",
		},
		validation: false,
	});
};

const storeUploadedPhotoDocument = async (
	boothId: string,
	metadata: UploadedPhotoMetadata,
) => {
	const { photoId, imagePath, imageUrl } = metadata;

	const docRef = uploadedPhotosCollection(boothId).doc(photoId);
	await docRef.set({
		boothId,
		photoId,
		imagePath,
		imageUrl,
		createdAt: FieldValue.serverTimestamp(),
	});
};

const uploadPhoto = async (boothId: string, file: File) => {
	const photoId = createPhotoId();
	const imagePath = createImagePath(photoId);

	await saveImageToStorage(imagePath, file);

	const imageUrl = createImageUrl(imagePath);
	await storeUploadedPhotoDocument(boothId, {
		photoId,
		imagePath,
		imageUrl,
	});

	return { photoId, imagePath, imageUrl };
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
	const snapshot = await uploadedPhotosCollection(boothId).get();

	return snapshot.docs.map((doc) => {
		const data = doc.data();
		const imagePathValue =
			typeof data.imagePath === "string" ? data.imagePath : "";
		const imageUrlValue = typeof data.imageUrl === "string" ? data.imageUrl : "";

		return {
			photoId: doc.id,
			imagePath: imagePathValue,
			imageUrl: imageUrlValue,
		};
	});
};

export const deleteUsedPhoto = async (photoId: string): Promise<void> => {
	const firestore = getAdminFirestore();
	const querySnapshot = await firestore
		.collectionGroup("uploadedPhotos")
		.where("photoId", "==", photoId)
		.limit(1)
		.get();

	if (querySnapshot.empty) {
		return;
	}

	const [docSnapshot] = querySnapshot.docs;
	const data = docSnapshot.data();

	const imagePathValue =
		typeof data.imagePath === "string" ? data.imagePath : null;

	await docSnapshot.ref.delete();

	if (imagePathValue) {
		await storageBucket()
			.file(imagePathValue)
			.delete()
			.catch(() => undefined);
	}
};
