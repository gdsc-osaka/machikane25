import { FieldValue } from "firebase-admin/firestore";
import type { GeneratedPhoto, UploadedPhoto } from "@/domain/photo";
import { getAdminFirestore } from "@/lib/firebase/admin";
import {
	generatedPhotoConverter,
	uploadedPhotoConverter,
} from "./photoConverters";

const firestore = () => getAdminFirestore();

const boothDocument = (boothId: string) =>
	firestore().collection("booths").doc(boothId);

const uploadedPhotosCollection = (boothId: string) =>
	boothDocument(boothId).collection("uploadedPhotos");

const generatedPhotosCollection = (boothId: string) =>
	boothDocument(boothId).collection("generatedPhotos");

export type CreateUploadedPhotoInput = {
	boothId: string;
	photoId: string;
	imagePath: string;
	imageUrl: string;
};

export const createUploadedPhoto = async (
	input: CreateUploadedPhotoInput,
): Promise<void> => {
	const { boothId, photoId, imagePath, imageUrl } = input;
	await uploadedPhotosCollection(boothId).doc(photoId).set({
		boothId,
		photoId,
		imagePath,
		imageUrl,
		createdAt: FieldValue.serverTimestamp(),
	});
};

export const fetchUploadedPhotos = async (
	boothId: string,
): Promise<UploadedPhoto[]> => {
	const snapshot = await uploadedPhotosCollection(boothId)
		.withConverter(uploadedPhotoConverter)
		.get();
	return snapshot.docs.map((doc) => doc.data());
};

export const deleteUploadedPhotoByDocumentPath = async (
	documentPath: string,
): Promise<void> => {
	await firestore().doc(documentPath).delete();
};

export const queryUploadedPhotosByPhotoId = (photoId: string) =>
	firestore()
		.collectionGroup("uploadedPhotos")
		.where("photoId", "==", photoId)
		.limit(1);

export type CreateGeneratedPhotoInput = {
	boothId: string;
	photoId: string;
	imagePath: string;
	imageUrl: string;
};

export const createGeneratedPhoto = async (
	input: CreateGeneratedPhotoInput,
): Promise<void> => {
	const { boothId, photoId, imagePath, imageUrl } = input;
	await generatedPhotosCollection(boothId).doc(photoId).set({
		boothId,
		photoId,
		imagePath,
		imageUrl,
		createdAt: FieldValue.serverTimestamp(),
	});
};

export const findGeneratedPhoto = async (
	boothId: string,
	photoId: string,
): Promise<GeneratedPhoto | null> => {
	const doc = await generatedPhotosCollection(boothId)
		.doc(photoId)
		.withConverter(generatedPhotoConverter)
		.get();

	if (!doc.exists) {
		return null;
	}

	return doc.data() ?? null;
};

export const collectionGroupGeneratedPhotos = () =>
	firestore().collectionGroup("generatedPhotos");

export const findGeneratedPhotoByPhotoId = async (
	photoId: string,
): Promise<GeneratedPhoto | null> => {
	const snapshot = await collectionGroupGeneratedPhotos()
		.withConverter(generatedPhotoConverter)
		.where("photoId", "==", photoId)
		.limit(1)
		.get();

	const document = snapshot.docs.at(0);
	return document ? document.data() : null;
};
