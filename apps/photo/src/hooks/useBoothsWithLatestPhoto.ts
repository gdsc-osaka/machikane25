"use client";

import {
	collection,
	doc,
	getDoc,
	onSnapshot,
	type DocumentData,
	type Firestore,
	Timestamp,
} from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import {
	ensureAnonymousSignIn,
	getFirebaseFirestore,
	initializeFirebaseClient,
} from "@/lib/firebase/client";

type LatestPhoto = {
	photoId: string;
	imageUrl: string;
	createdAt: Date | null;
};

export type BoothWithLatestPhoto = {
	boothId: string;
	latestPhoto: LatestPhoto | null;
};

type HookState = {
	booths: BoothWithLatestPhoto[];
	isLoading: boolean;
	error: Error | null;
};

const toDate = (value: unknown): Date | null => {
	if (value instanceof Date) {
		return value;
	}
	if (value instanceof Timestamp) {
		return value.toDate();
	}
	if (typeof value === "object" && value !== null) {
		const toDateMethod = Reflect.get(value, "toDate");
		if (typeof toDateMethod === "function") {
			const converted = toDateMethod.call(value);
			return converted instanceof Date ? converted : null;
		}
	}
	return null;
};

const resolveLatestPhoto = async (
	firestore: Firestore,
	boothId: string,
	latestPhotoId: string,
): Promise<LatestPhoto | null> => {
	const photoRef = doc(
		firestore,
		"booths",
		boothId,
		"generatedPhotos",
		latestPhotoId,
	);
	const snapshot = await getDoc(photoRef);

	if (!snapshot.exists()) {
		return null;
	}

	const data = snapshot.data();
	const imageUrl = Reflect.get(data, "imageUrl");
	const createdAt = Reflect.get(data, "createdAt");

	if (typeof imageUrl !== "string" || imageUrl.length === 0) {
		return null;
	}

	return {
		photoId: latestPhotoId,
		imageUrl,
		createdAt: toDate(createdAt),
	};
};

const parseBoothDocument = (docData: DocumentData, boothId: string) => {
	const latestPhotoId = Reflect.get(docData, "latestPhotoId");
	return {
		boothId,
		latestPhotoId:
			typeof latestPhotoId === "string" && latestPhotoId.length > 0
				? latestPhotoId
				: null,
	};
};

export const useBoothsWithLatestPhoto = (): HookState => {
	const [booths, setBooths] = useState<BoothWithLatestPhoto[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);
	const unsubscribeRef = useRef<(() => void) | null>(null);
	const isMountedRef = useRef(true);

	useEffect(() => {
		isMountedRef.current = true;
		setIsLoading(true);
		setError(null);

		const subscribe = async () => {
			try {
				initializeFirebaseClient();
				await ensureAnonymousSignIn();

				if (!isMountedRef.current) {
					return;
				}

				const firestore = getFirebaseFirestore();
				const boothsCollection = collection(firestore, "booths");

				unsubscribeRef.current = onSnapshot(
					boothsCollection,
					(snapshot) => {
						const boothDocuments = snapshot.docs.map((document) =>
							parseBoothDocument(document.data(), document.id),
						);

						const loadLatestPhotos = boothDocuments.map(async (booth) => {
							if (!booth.latestPhotoId) {
								return {
									boothId: booth.boothId,
									latestPhoto: null,
								};
							}

							const latestPhoto = await resolveLatestPhoto(
								firestore,
								booth.boothId,
								booth.latestPhotoId,
							);

							return {
								boothId: booth.boothId,
								latestPhoto,
							};
						});

						void Promise.all(loadLatestPhotos)
							.then((latestPhotos) => {
								if (!isMountedRef.current) {
									return;
								}
								setBooths(latestPhotos);
								setIsLoading(false);
								setError(null);
							})
							.catch((loadError) => {
								if (!isMountedRef.current) {
									return;
								}
								setIsLoading(false);
								setError(
									loadError instanceof Error
										? loadError
										: new Error("Failed to load latest photos"),
								);
							});
					},
					(subscriptionError) => {
						if (!isMountedRef.current) {
							return;
						}
						setIsLoading(false);
						setError(subscriptionError);
					},
				);
			} catch (initializationError) {
				if (!isMountedRef.current) {
					return;
				}
				setIsLoading(false);
				setError(
					initializationError instanceof Error
						? initializationError
						: new Error("Failed to initialize Firebase client"),
				);
			}
		};

		void subscribe();

		return () => {
			isMountedRef.current = false;
			const unsubscribe = unsubscribeRef.current;
			if (typeof unsubscribe === "function") {
				unsubscribe();
			}
		};
	}, []);

	return {
		booths,
		isLoading,
		error,
	};
};
