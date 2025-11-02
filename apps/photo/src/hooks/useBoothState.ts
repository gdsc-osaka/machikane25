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
	generatedPhotoIds: string[] | null;
	lastTakePhotoAt: Date | null;
};

type BoothStateResult = {
	booth: BoothSnapshot | null;
	generatedPhotoUrls: string[];
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

const fetchGeneratedPhotoUrls = async (
	firestore: Firestore,
	boothId: string,
	photoIds: string[],
): Promise<string[]> => {
	const urls: string[] = [];
	for (const photoId of photoIds) {
		const generatedRef = doc(
			firestore,
			"booths",
			boothId,
			"generatedPhotos",
			photoId,
		);
		const snapshot = await getDoc(generatedRef);

		if (snapshot.exists()) {
			const data = snapshot.data();
			const imageUrl = Reflect.get(data, "imageUrl");

			if (typeof imageUrl === "string") {
				urls.push(imageUrl);
			}
		}
	}
	return urls;
};

export const useBoothState = (boothId: string): BoothStateResult => {
	const [booth, setBooth] = useState<BoothSnapshot | null>(null);
	const [generatedUrls, setGeneratedUrls] = useState<string[]>([]);
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
							setGeneratedUrls([]);
							return;
						}

						const data = snapshot.data();
						const stateValue = parseState(Reflect.get(data, "state"));
						const generatedPhotoIdsValue = Reflect.get(
							data,
							"generatedPhotoIds",
						);
						const lastTakePhotoAtValue = Reflect.get(data, "lastTakePhotoAt");

						const boothSnapshot: BoothSnapshot = {
							id: typeof snapshot.id === "string" ? snapshot.id : boothId,
							state: stateValue,
							generatedPhotoIds:
								Array.isArray(generatedPhotoIdsValue) &&
								generatedPhotoIdsValue.every((id) => typeof id === "string")
									? generatedPhotoIdsValue
									: null,
							lastTakePhotoAt: toDate(lastTakePhotoAtValue),
						};

						setBooth(boothSnapshot);
						setError(null);

						if (
							boothSnapshot.generatedPhotoIds &&
							boothSnapshot.generatedPhotoIds.length > 0
						) {
							void fetchGeneratedPhotoUrls(
								firestore,
								boothSnapshot.id,
								boothSnapshot.generatedPhotoIds,
							)
								.then((urls) => {
									if (isMountedRef.current) {
										setGeneratedUrls(urls);
									}
								})
								.catch((fetchError) => {
									if (isMountedRef.current) {
										setError(
											fetchError instanceof Error
												? fetchError
												: new Error("Failed to load generated photos"),
										);
									}
								});
						} else {
							setGeneratedUrls([]);
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
		generatedPhotoUrls: generatedUrls,
		isLoading,
		error,
	};
};
