import {
  Timestamp,
  type FirestoreDataConverter,
  type QueryDocumentSnapshot,
} from "firebase-admin/firestore";
import {
  ensureGeneratedPhoto,
  ensureUploadedPhoto,
  type GeneratedPhoto,
  type UploadedPhoto,
} from "@/domain/photo";

const toDate = (value: unknown): Date => {
  if (value instanceof Date) {
    return value;
  }
  if (value instanceof Timestamp) {
    return value.toDate();
  }

  if (typeof value === "object" && value !== null) {
    const toDateCandidate = Reflect.get(value, "toDate");
    if (typeof toDateCandidate === "function") {
      const converted = toDateCandidate.call(value);
      if (converted instanceof Date) {
        return converted;
      }
    }
  }

  throw new Error("Invalid timestamp value in Firestore document");
};

const parseSnapshot = <T extends UploadedPhoto | GeneratedPhoto>(
  snapshot: QueryDocumentSnapshot,
): T => {
  const data = snapshot.data();

  // Extract boothId from document path (booths/{boothId}/generatedPhotos/{photoId})
  const pathParts = snapshot.ref.path.split("/");
  const boothIdFromPath = pathParts.length >= 2 ? pathParts[1] : "";

  const boothId =
    typeof data.boothId === "string" && data.boothId
      ? data.boothId
      : boothIdFromPath;
  const photoId = typeof data.photoId === "string" ? data.photoId : snapshot.id;
  const imagePath = typeof data.imagePath === "string" ? data.imagePath : "";
  const imageUrl = typeof data.imageUrl === "string" ? data.imageUrl : "";
  const createdAt = toDate(data.createdAt);

  return {
    boothId,
    photoId,
    imagePath,
    imageUrl,
    createdAt,
  } as T;
};

const toFirestoreData = <T extends UploadedPhoto | GeneratedPhoto>(
  value: T,
) => ({
  boothId: value.boothId,
  photoId: value.photoId,
  imagePath: value.imagePath,
  imageUrl: value.imageUrl,
  createdAt: Timestamp.fromDate(value.createdAt),
});

export const uploadedPhotoConverter: FirestoreDataConverter<UploadedPhoto> = {
  toFirestore: toFirestoreData,
  fromFirestore: (snapshot) => ensureUploadedPhoto(parseSnapshot(snapshot)),
};

export const generatedPhotoConverter: FirestoreDataConverter<GeneratedPhoto> = {
  toFirestore: toFirestoreData,
  fromFirestore: (snapshot) => ensureGeneratedPhoto(parseSnapshot(snapshot)),
};
