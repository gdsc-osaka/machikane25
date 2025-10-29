import {
	applicationDefault,
	getApp,
	getApps,
	initializeApp,
} from "firebase-admin/app";
import {
	type Firestore,
	type FirestoreDataConverter,
	getFirestore,
} from "firebase-admin/firestore";
import { getStorage, type Storage } from "firebase-admin/storage";
import type { FishDocument } from "../domain/fish/fish.js";
import { AppError } from "../errors/app-error.js";
import type { Config } from "./env.js";

type FirebaseServices = Readonly<{
	firestore: Firestore;
	storage: Storage;
	converters: Readonly<{
		fish: FirestoreDataConverter<FishDocument>;
	}>;
}>;

const fishConverter: FirestoreDataConverter<FishDocument> = {
	toFirestore: (fish) => ({
		imageUrl: fish.imageUrl,
		imagePath: fish.imagePath,
		color: fish.color,
		createdAt: fish.createdAt,
	}),
	fromFirestore: (snapshot) => {
		const data = snapshot.data() as Omit<FishDocument, "id">;
		return Object.freeze({
			id: snapshot.id,
			imageUrl: data.imageUrl,
			imagePath: data.imagePath,
			color: data.color,
			createdAt: data.createdAt,
		});
	},
};

export class FirebaseInitializationError extends AppError {
	constructor(params: Readonly<{ cause: unknown; projectId: string }>) {
		super({
			message: "Unable to initialize Firebase Admin SDK",
			code: "FIREBASE_INIT_FAILED",
			name: "FirebaseInitializationError",
			context: { projectId: params.projectId },
			cause: params.cause,
		});
	}
}

const alignCredentialsPath = (path: string | undefined) => {
	if (path === undefined || path.length === 0) {
		return;
	}
	if (process.env.GOOGLE_APPLICATION_CREDENTIALS !== path) {
		process.env.GOOGLE_APPLICATION_CREDENTIALS = path;
	}
};

const resolveApp = (config: Config) => {
	const existingApps = getApps();
	if (existingApps.length > 0) {
		return getApp();
	}
	return initializeApp({
		credential: applicationDefault(),
		projectId: config.firebaseProjectId,
	});
};

export const getFirebaseServices = (config: Config): FirebaseServices => {
	try {
		alignCredentialsPath(config.credentialsPath);
		const app = resolveApp(config);
		const firestore = getFirestore(app);
		const storage = getStorage(app);
		return {
			firestore,
			storage,
			converters: {
				fish: fishConverter,
			},
		};
	} catch (error) {
		throw new FirebaseInitializationError({
			cause: error,
			projectId: config.firebaseProjectId,
		});
	}
};
