import {
	type FirestoreDataConverter,
	type QueryDocumentSnapshot,
	Timestamp,
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
	const modelId = typeof data.modelId === "string" ? data.modelId : undefined;
	const createdAt = toDate(data.createdAt);

	const status =
		typeof data.status === "string" &&
		(data.status === "generating" ||
			data.status === "completed" ||
			data.status === "failed")
			? (data.status as GeneratedPhoto["status"])
			: "completed";

	return {
		boothId,
		photoId,
		imagePath,
		imageUrl,
		modelId,
		status,
		createdAt,
	} as T;
};

const toFirestoreData = <T extends UploadedPhoto | GeneratedPhoto>(
	value: T,
) => {
	const data: Record<string, unknown> = {
		boothId: value.boothId,
		photoId: value.photoId,
		imagePath: value.imagePath,
		imageUrl: value.imageUrl,
		status: (value as GeneratedPhoto).status,
		createdAt: Timestamp.fromDate(value.createdAt),
	};

	if ("modelId" in value && value.modelId) {
		data.modelId = value.modelId;
	}

	return data;
};

export const uploadedPhotoConverter: FirestoreDataConverter<UploadedPhoto> = {
	toFirestore: toFirestoreData,
	fromFirestore: (snapshot) => ensureUploadedPhoto(parseSnapshot(snapshot)),
};

export const generatedPhotoConverter: FirestoreDataConverter<GeneratedPhoto> = {
	toFirestore: toFirestoreData,
	fromFirestore: (snapshot) => ensureGeneratedPhoto(parseSnapshot(snapshot)),
};
