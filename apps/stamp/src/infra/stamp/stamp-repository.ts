import {
	collection,
	doc,
	getDoc,
	setDoc,
	type Firestore,
} from "firebase/firestore";
import { type StampLedger } from "@/domain/stamp";
import { stampConverter, type StampRecord } from "@/infra/stamp/stamp-converter";

type StampRepository = {
	getByUserId: (userId: string) => Promise<StampRecord | null>;
	save: (input: {
		userId: string;
		ledger: StampLedger;
		collectedAt: number | null;
	}) => Promise<void>;
};

type StampRepositoryDeps = {
	firestore: Firestore;
};

const STAMP_COLLECTION = "users";

const createStampRepository = ({
	firestore,
}: StampRepositoryDeps): StampRepository => {
	const collectionRef = collection(firestore, STAMP_COLLECTION).withConverter(
		stampConverter,
	);

	const getByUserId = async (userId: string) => {
		const docRef = doc(collectionRef, userId);
		const snapshot = await getDoc(docRef);
		if (!snapshot.exists()) {
			return null;
		}
		return snapshot.data();
	};

	const save: StampRepository["save"] = async ({
		userId,
		ledger,
		collectedAt,
	}) => {
		const docRef = doc(collectionRef, userId);
		const snapshot = await getDoc(docRef);
		const existing = snapshot.exists() ? snapshot.data() : null;
		const createdAt =
			existing?.createdAt ?? collectedAt ?? Date.now();
		const lastCollectedAt =
			collectedAt ?? existing?.lastCollectedAt ?? null;
		const record: StampRecord = {
			userId,
			ledger,
			createdAt,
			lastCollectedAt,
		};

		await setDoc(docRef, record, { merge: true });
	};

	return {
		getByUserId,
		save,
	};
};

export { createStampRepository, STAMP_COLLECTION };

export type { StampRepository, StampRecord };
