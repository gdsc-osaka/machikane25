import {
	type Firestore,
	type FirestoreDataConverter,
	type QueryDocumentSnapshot,
	Timestamp,
} from "firebase-admin/firestore";
import type { FishRepository } from "../../application/ports.js";
import type { Fish, FishDocument } from "../../domain/fish/fish.js";
import { createFish } from "../../domain/fish/fish.js";
import { AppError } from "../../errors/app-error.js";
import { RepositoryError } from "../../errors/infrastructure-errors.js";

const COLLECTION_NAME = "fishs";

const toDocument = (fish: Fish): FishDocument =>
	Object.freeze({
		id: fish.id,
		imageUrl: fish.imageUrl,
		imagePath: fish.imagePath,
		color: fish.color,
		createdAt: Timestamp.fromDate(fish.createdAt),
	});

const fromSnapshot = (snapshot: QueryDocumentSnapshot<FishDocument>): Fish => {
	const data = snapshot.data();
	try {
		return createFish({
			id: data.id,
			imageUrl: data.imageUrl,
			imagePath: data.imagePath,
			color: data.color,
			createdAt: data.createdAt.toDate(),
		});
	} catch (error) {
		if (error instanceof AppError) {
			throw new RepositoryError({
				message: "Invalid fish document data",
				code: "FIRESTORE_DATA_INVALID",
				context: { id: data.id },
				cause: error,
			});
		}
		throw error;
	}
};

type FirestoreLike = Readonly<Pick<Firestore, "collection">>;

export type FirestoreDeps = Readonly<{
	firestore: FirestoreLike;
	converter: FirestoreDataConverter<FishDocument>;
}>;

export const createFirestoreFishRepository = (
	deps: FirestoreDeps,
): FishRepository => {
	const collection = deps.firestore
		.collection(COLLECTION_NAME)
		.withConverter(deps.converter);

	const save: FishRepository["save"] = async (fish) => {
		try {
			const docRef = collection.doc(fish.id);
			const document = toDocument(fish);
			await docRef.set(document);
		} catch (error) {
			if (error instanceof AppError) {
				throw error;
			}
			throw new RepositoryError({
				message: "Failed to persist fish",
				code: "FIRESTORE_WRITE_FAILED",
				context: { id: fish.id },
				cause: error,
			});
		}
	};

	const list: FishRepository["list"] = async () => {
		try {
			const snapshot = await collection.get();
			return snapshot.docs.map(fromSnapshot);
		} catch (error) {
			if (error instanceof AppError) {
				throw error;
			}
			throw new RepositoryError({
				message: "Failed to read fish collection",
				code: "FIRESTORE_READ_FAILED",
				cause: error,
			});
		}
	};

	return Object.freeze({
		save,
		list,
	});
};
