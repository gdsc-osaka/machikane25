import { collection, onSnapshot } from "firebase/firestore";
import { use, useCallback, useEffect, useRef, useState } from "react";
import {
	getFirebaseFirestore,
	initializeFirebaseClient,
} from "@/lib/firebase/client";
import { set } from "zod";

type GenerationOptionItem = {
	id: string;
	typeId: string;
	displayName: string;
	imageUrl: string | null;
	imagePath: string | null;
};

type GenerationOptionsState = Record<string, GenerationOptionItem[]>;

type GenerationOptionsResult = {
	options: GenerationOptionsState;
	isLoading: boolean;
	error: Error | null;
	resetOptions: () => void;
};

export const useGenerationOptions = (): GenerationOptionsResult => {
	const [options, setOptions] = useState<GenerationOptionsState>({});
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);
	const isMountedRef = useRef(true);

	useEffect(() => {
		isMountedRef.current = true;
		initializeFirebaseClient();

		const firestore = getFirebaseFirestore();
		const optionsCollection = collection(firestore, "options");

		const unsubscribe = onSnapshot(
			optionsCollection,
			(snapshot) => {
				if (!isMountedRef.current) {
					return;
				}
				setIsLoading(false);

				const mapped = snapshot.docs.map<GenerationOptionItem>(
					(docSnapshot) => {
						const data = docSnapshot.data();

						const typeIdValue = Reflect.get(data, "typeId");
						const displayNameValue = Reflect.get(data, "displayName");
						const imageUrlValue = Reflect.get(data, "imageUrl");
						const imagePathValue = Reflect.get(data, "imagePath");

						return {
							id: docSnapshot.id,
							typeId: typeof typeIdValue === "string" ? typeIdValue : "unknown",
							displayName:
								typeof displayNameValue === "string" ? displayNameValue : "",
							imageUrl:
								typeof imageUrlValue === "string" ? imageUrlValue : null,
							imagePath:
								typeof imagePathValue === "string" ? imagePathValue : null,
						};
					},
				);

				const grouped = mapped.reduce<GenerationOptionsState>((acc, option) => {
					const current = acc[option.typeId] ?? [];
					return {
						...acc,
						[option.typeId]: [...current, option],
					};
				}, {});

				setOptions(grouped);
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
	}, []);

	const resetOptions = useCallback(() => {
		setOptions({});
		setIsLoading(true);
		setError(null);
	}, []);


	return {
		options,
		isLoading,
		error,
		resetOptions,
	};
};
