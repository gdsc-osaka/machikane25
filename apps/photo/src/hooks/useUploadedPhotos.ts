import { useEffect, useRef, useState } from "react";
import {
	collection,
	onSnapshot,
	orderBy,
	query,
} from "firebase/firestore";
import { ref, getDownloadURL } from "firebase/storage";
import {
	getFirebaseFirestore,
	getFirebaseStorage,
	initializeFirebaseClient,
	ensureAnonymousSignIn,
} from "@/lib/firebase/client";

type UploadedPhotoItem = {
	photoId: string;
	imageUrl: string;
	imagePath: string;
};

type UploadedPhotosResult = {
	photos: UploadedPhotoItem[];
	isLoading: boolean;
	error: Error | null;
};

export const useUploadedPhotos = (boothId: string): UploadedPhotosResult => {
	const [photos, setPhotos] = useState<UploadedPhotoItem[]>([]);
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
				const collectionRef = collection(
					firestore,
					"booths",
					boothId,
					"uploadedPhotos",
				);
				const photosQuery = query(collectionRef, orderBy("createdAt", "desc"));

				unsubscribe = onSnapshot(
					photosQuery,
					async (snapshot) => {
						if (!isMountedRef.current) {
							return;
						}
						setIsLoading(false);
						setError(null);

						// Get download URLs using Firebase Storage SDK
						const storage = getFirebaseStorage();
						const photoPromises = snapshot.docs.map(async (docSnapshot) => {
							const data = docSnapshot.data();
							const imagePath = Reflect.get(data, "imagePath");
							const imagePathStr = typeof imagePath === "string" ? imagePath : "";

							let imageUrl = "";
							if (imagePathStr) {
								try {
									const storageRef = ref(storage, imagePathStr);
									imageUrl = await getDownloadURL(storageRef);
								} catch (urlError) {
									console.error(`[useUploadedPhotos] Failed to get download URL for ${imagePathStr}:`, urlError);
								}
							}

							return {
								photoId: docSnapshot.id,
								imageUrl,
								imagePath: imagePathStr,
							};
						});

						const mapped = await Promise.all(photoPromises);
						setPhotos(mapped);
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
						: new Error("Failed to load uploaded photos"),
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
		photos,
		isLoading,
		error,
	};
};
