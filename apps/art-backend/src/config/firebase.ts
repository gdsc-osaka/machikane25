import { readFileSync } from "node:fs";
import admin from "firebase-admin";

import type { Config } from "./env.js";

export type FishDocument = Readonly<{
	id: string;
	imageUrl: string;
	imagePath: string;
	color: string;
	createdAt: FirebaseFirestore.Timestamp;
}>;

type FirestoreInstance = ReturnType<typeof admin.firestore>;
type StorageInstance = ReturnType<typeof admin.storage>;

type FirebaseServices = Readonly<{
	firestore: FirestoreInstance;
	storage: StorageInstance;
	converters: Readonly<{
		fish: FirebaseFirestore.FirestoreDataConverter<FishDocument>;
	}>;
}>;

const loadServiceAccount = (path: string) => {
	const file = readFileSync(path, "utf8");
	return JSON.parse(file);
};

const ensureAppInitialised = (config: Config) => {
	if (admin.apps.length > 0) {
		return;
	}

	const serviceAccount = loadServiceAccount(config.credentialsPath);
	const credential = admin.credential.cert(serviceAccount);

	admin.initializeApp({
		credential,
		projectId: config.firebaseProjectId,
		storageBucket: `${config.firebaseProjectId}.appspot.com`,
	});
};

const isTimestamp = (value: unknown): value is FirebaseFirestore.Timestamp => {
	if (typeof value !== "object" || value === null) {
		return false;
	}

	const toDate = Reflect.get(value, "toDate");
	const toMillis = Reflect.get(value, "toMillis");

	return typeof toDate === "function" && typeof toMillis === "function";
};

const isFishDocument = (value: unknown): value is FishDocument => {
	if (typeof value !== "object" || value === null) {
		return false;
	}

	const id = Reflect.get(value, "id");
	const imageUrl = Reflect.get(value, "imageUrl");
	const imagePath = Reflect.get(value, "imagePath");
	const color = Reflect.get(value, "color");
	const createdAt = Reflect.get(value, "createdAt");

	return (
		typeof id === "string" &&
		typeof imageUrl === "string" &&
		typeof imagePath === "string" &&
		typeof color === "string" &&
		isTimestamp(createdAt)
	);
};

const createFishConverter =
	(): FirebaseFirestore.FirestoreDataConverter<FishDocument> => ({
		toFirestore: (fish) => fish,
		fromFirestore: (snapshot) => {
			const data = snapshot.data();

			if (!isFishDocument(data)) {
				throw new Error("Invalid fish document");
			}

			return data;
		},
	});

export const getFirebaseServices = (config: Config): FirebaseServices => {
	ensureAppInitialised(config);

	const services: FirebaseServices = {
		firestore: admin.firestore(),
		storage: admin.storage(),
		converters: {
			fish: createFishConverter(),
		},
	};

	return Object.freeze(services);
};
