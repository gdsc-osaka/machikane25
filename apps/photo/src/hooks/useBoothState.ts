import { useEffect, useRef, useState } from "react";
import {
	doc,
	getDoc,
	onSnapshot,
	Timestamp,
	type Firestore,
} from "firebase/firestore";
import { boothStateSchema, type BoothState } from "@/domain/booth";
import {
	getFirebaseFirestore,
	initializeFirebaseClient,
	ensureAnonymousSignIn,
} from "@/lib/firebase/client";

type BoothSnapshot = {
	id: string;
	state: BoothState;
	latestPhotoId: string | null;
	lastTakePhotoAt: Date | null;
};

type BoothStateResult = {
	booth: BoothSnapshot | null;
	latestGeneratedPhotoUrl: string | null;
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
	photoId: string,
): Promise<string | null> => {
	const generatedRef = doc(firestore, "generatedPhotos", photoId);
	const snapshot = await getDoc(generatedRef);

	if (!snapshot.exists()) {
		return null;
	}

	const data = snapshot.data();
	const imageUrl = Reflect.get(data, "imageUrl");
	return typeof imageUrl === "string" ? imageUrl : null;
};

export const useBoothState = (boothId: string): BoothStateResult => {
	const [booth, setBooth] = useState<BoothSnapshot | null>(null);
	const [latestUrl, setLatestUrl] = useState<string | null>(null);
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
					(snapshot) => {
						if (!isMountedRef.current) {
							return;
						}

						setIsLoading(false);
						console.log("Booth snapshot received:", snapshot);

						if (!snapshot.exists()) {
							setBooth(null);
							setLatestUrl(null);
							return;
						}

						const data = snapshot.data();
						const stateValue = parseState(Reflect.get(data, "state"));
						const latestPhotoIdValue = Reflect.get(data, "latestPhotoId");
						const lastTakePhotoAtValue = Reflect.get(data, "lastTakePhotoAt");

						const boothSnapshot: BoothSnapshot = {
							id: typeof snapshot.id === "string" ? snapshot.id : boothId,
							state: stateValue,
							latestPhotoId:
								typeof latestPhotoIdValue === "string"
									? latestPhotoIdValue
									: null,
							lastTakePhotoAt: toDate(lastTakePhotoAtValue),
						};

						setBooth(boothSnapshot);
						setError(null);

						if (boothSnapshot.latestPhotoId) {
							void fetchGeneratedPhotoUrl(
								firestore,
								boothSnapshot.latestPhotoId,
							)
								.then((url) => {
									if (isMountedRef.current) {
										setLatestUrl(url);
									}
								})
								.catch((fetchError) => {
									if (isMountedRef.current) {
										setError(
											fetchError instanceof Error
												? fetchError
												: new Error("Failed to load generated photo"),
										);
									}
								});
						} else {
							setLatestUrl(null);
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
		latestGeneratedPhotoUrl: latestUrl,
		isLoading,
		error,
	};
};
