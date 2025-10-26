import { useEffect, useRef, useState } from "react";
import {
	collection,
	onSnapshot,
	orderBy,
	query,
} from "firebase/firestore";
import {
	getFirebaseFirestore,
	initializeFirebaseClient,
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
		initializeFirebaseClient();

		const firestore = getFirebaseFirestore();
		const collectionRef = collection(firestore, "booths", boothId, "uploadedPhotos");
		const photosQuery = query(collectionRef, orderBy("createdAt", "desc"));

		const unsubscribe = onSnapshot(
			photosQuery,
			(snapshot) => {
				if (!isMountedRef.current) {
					return;
				}
				setIsLoading(false);

				const mapped = snapshot.docs.map((docSnapshot) => {
					const data = docSnapshot.data();
					const imageUrl = Reflect.get(data, "imageUrl");
					const imagePath = Reflect.get(data, "imagePath");

					return {
						photoId: docSnapshot.id,
						imageUrl: typeof imageUrl === "string" ? imageUrl : "",
						imagePath: typeof imagePath === "string" ? imagePath : "",
					};
				});

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

		return () => {
			isMountedRef.current = false;
			unsubscribe();
		};
	}, [boothId]);

	return {
		photos,
		isLoading,
		error,
	};
};
