/**
 * T306 [US1] Application: PhotoService
 *
 * Handles Storage uploads and Firestore metadata for uploaded photos.
 */

import { ulid } from "ulid";
import { Buffer } from "node:buffer";
import { getAdminStorage } from "@/lib/firebase/admin";
import {
  createUploadedPhoto,
  deleteUploadedPhotoByDocumentPath,
  fetchUploadedPhotos,
  queryUploadedPhotosByPhotoId,
} from "@/infra/firebase/photoRepository";

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
  return ["https://storage.googleapis.com", bucket.name, imagePath].join("/");
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
  await createUploadedPhoto({
    boothId,
    photoId,
    imagePath,
    imageUrl,
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

  return { photoId, imagePath, imageUrl } satisfies UploadedPhotoMetadata;
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
