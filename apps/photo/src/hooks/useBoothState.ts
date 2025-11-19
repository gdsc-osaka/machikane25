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

type BoothStateResult = {
	booth: BoothSnapshot | null;
	latestGeneratedPhotoUrls: string[];
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

const fetchGeneratedPhotoUrl = async (
	firestore: Firestore,
	boothId: string,
	photoId: string,
): Promise<string | null> => {
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

	if (typeof imageUrl !== "string") {
		return null;
	}

	return imageUrl;
};

export const useBoothState = (boothId: string): BoothStateResult => {
	const [booth, setBooth] = useState<BoothSnapshot | null>(null);
	const [latestUrls, setLatestUrls] = useState<string[]>([]);
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
							setLatestUrls([]);
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
							setLatestUrls([]);
						} else if (
							boothSnapshot.latestPhotoIds &&
							boothSnapshot.latestPhotoIds.length > 0
						) {
							const urls = await Promise.all(
								boothSnapshot.latestPhotoIds.map((id) =>
									fetchGeneratedPhotoUrl(firestore, boothSnapshot.id, id).catch(
										() => "",
									),
								),
							);
							if (isMountedRef.current) {
								const validUrls = urls.filter(
									(url): url is string => typeof url === "string" && url.length > 0,
								);
								setLatestUrls(validUrls);
							}
						} else {
							setLatestUrls([]);
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
		latestGeneratedPhotoUrls: latestUrls,
		isLoading,
		error,
	};
};
