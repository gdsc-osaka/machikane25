import {
	doc,
	type Firestore,
	getDoc,
	onSnapshot,
	Timestamp,
} from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import { type BoothState, boothStateSchema } from "@/domain/booth";
import {
	ensureAnonymousSignIn,
	getFirebaseFirestore,
	initializeFirebaseClient,
} from "@/lib/firebase/client";

type BoothSnapshot = {
	id: string;
	state: BoothState;
	latestPhotoIds: string[] | null;
	lastTakePhotoAt: Date | null;
};

export type GeneratedPhotoData = {
	url: string;
	modelId?: string;
};

type BoothStateResult = {
	booth: BoothSnapshot | null;
	latestGeneratedPhotos: GeneratedPhotoData[];
	isLoading: boolean;
	error: Error | null;
};

const toDate = (value: unknown): Date | null => {
	if (value instanceof Timestamp) {
		return value.toDate();
	}
	if (typeof value === "object" && value !== null) {
		const toDateCandidate = Reflect.get(value, "toDate");
		if (typeof toDateCandidate === "function") {
			return toDateCandidate.call(value);
		}
	}
	return null;
};

const parseState = (value: unknown): BoothState => {
	if (typeof value !== "string") {
		return "idle";
	}
	const parsed = boothStateSchema.safeParse(value);
	return parsed.success ? parsed.data : "idle";
};

const fetchGeneratedPhotoData = async (
	firestore: Firestore,
	boothId: string,
	photoId: string,
): Promise<GeneratedPhotoData | null> => {
	const generatedRef = doc(
		firestore,
		"booths",
		boothId,
		"generatedPhotos",
		photoId,
	);
	const snapshot = await getDoc(generatedRef);

	if (!snapshot.exists()) {
		return null;
	}

	const data = snapshot.data();
	const imageUrl = Reflect.get(data, "imageUrl");
	const modelId = Reflect.get(data, "modelId");

	if (typeof imageUrl !== "string") {
		return null;
	}

	return {
		url: imageUrl,
		modelId: typeof modelId === "string" ? modelId : undefined,
	};
};

export const useBoothState = (boothId: string): BoothStateResult => {
	const [booth, setBooth] = useState<BoothSnapshot | null>(null);
	const [latestPhotos, setLatestPhotos] = useState<GeneratedPhotoData[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);
	const isMountedRef = useRef(true);

	useEffect(() => {
		isMountedRef.current = true;
		setIsLoading(true);
		setError(null);

		let unsubscribe: (() => void) | null = null;
		let isCancelled = false;

		const setupSubscription = async () => {
			try {
				initializeFirebaseClient();
				await ensureAnonymousSignIn();

				if (isCancelled) {
					return;
				}

				const firestore = getFirebaseFirestore();
				const boothRef = doc(firestore, "booths", boothId);

				unsubscribe = onSnapshot(
					boothRef,
					// eslint-disable-next-line @typescript-eslint/no-misused-promises
					async (snapshot) => {
						if (!isMountedRef.current) {
							return;
						}

						setIsLoading(false);
						console.log("Booth snapshot received:", snapshot);

						if (!snapshot.exists()) {
							setBooth(null);
							setLatestPhotos([]);
							return;
						}

						const data = snapshot.data();
						const stateValue = parseState(Reflect.get(data, "state"));
						const latestPhotoIdsValue = Reflect.get(data, "latestPhotoIds");
						const lastTakePhotoAtValue = Reflect.get(data, "lastTakePhotoAt");

						const boothSnapshot: BoothSnapshot = {
							id: typeof snapshot.id === "string" ? snapshot.id : boothId,
							state: stateValue,
							latestPhotoIds: Array.isArray(latestPhotoIdsValue)
								? latestPhotoIdsValue
								: null,
							lastTakePhotoAt: toDate(lastTakePhotoAtValue),
						};

						setBooth(boothSnapshot);
						setError(null);

						// Clear the photo URL when generating to prevent flickering
						if (boothSnapshot.state === "generating") {
							setLatestPhotos([]);
						} else if (
							boothSnapshot.latestPhotoIds &&
							boothSnapshot.latestPhotoIds.length > 0
						) {
							const photos = await Promise.all(
								boothSnapshot.latestPhotoIds.map((id) =>
									fetchGeneratedPhotoData(
										firestore,
										boothSnapshot.id,
										id,
									).catch(() => null),
								),
							);
							if (isMountedRef.current) {
								const validPhotos = photos.filter(
									(p): p is GeneratedPhotoData => p !== null,
								);
								setLatestPhotos(validPhotos);
							}
						} else {
							setLatestPhotos([]);
						}
					},
					(snapshotError) => {
						if (!isMountedRef.current) {
							return;
						}
						setIsLoading(false);
						setError(snapshotError);
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
						: new Error("Failed to load booth state"),
				);
			}
		};

		void setupSubscription();

		return () => {
			isCancelled = true;
			isMountedRef.current = false;
			if (typeof unsubscribe === "function") {
				unsubscribe();
			}
		};
	}, [boothId]);

	return {
		booth,
		latestGeneratedPhotos: latestPhotos,
		isLoading,
		error,
	};
};
