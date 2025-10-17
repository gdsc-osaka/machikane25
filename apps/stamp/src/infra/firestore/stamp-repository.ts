import {
	doc,
	getDoc,
	setDoc,
	type Firestore,
} from "firebase/firestore";
import { mergeLedger, type StampCheckpoint, type StampLedger } from "@/domain/stamp";

type StampDocument = {
	ledger: StampLedger;
	createdAt: number;
	lastCollectedAt: number | null;
};

type StampRepository = {
	getByUserId: (userId: string) => Promise<StampDocument | null>;
	save: (input: {
		userId: string;
		ledger: StampLedger;
		collectedAt: number | null;
	}) => Promise<void>;
};

const toFirestorePayload = ({
	ledger,
	createdAt,
	lastCollectedAt,
}: {
	ledger: StampLedger;
	createdAt: number;
	lastCollectedAt: number | null;
}) => ({
	stamps: ledger,
	createdAt,
	lastCollectedAt,
});

const parseDocument = (raw: unknown): StampDocument | null => {
	if (typeof raw !== "object" || raw === null) {
		return null;
	}
	const record = raw as Record<string, unknown>;
	const createdAt = typeof record.createdAt === "number" ? record.createdAt : null;
	if (createdAt === null) {
		return null;
	}
	const lastCollectedRaw = record.lastCollectedAt;
	const lastCollectedAt =
		typeof lastCollectedRaw === "number" ? lastCollectedRaw : null;
	const ledgerRaw = record.stamps;
	const ledger =
		typeof ledgerRaw === "object" && ledgerRaw !== null
			? (ledgerRaw as Partial<Record<StampCheckpoint, number | null>>)
			: null;
	return {
		ledger: mergeLedger(ledger as StampLedger),
		createdAt,
		lastCollectedAt,
	};
};

const createStampRepository = ({
	firestore,
	collectionPath,
}: {
	firestore: Firestore;
	collectionPath: string;
}): StampRepository => {
	const getByUserId = async (userId: string): Promise<StampDocument | null> => {
		const reference = doc(firestore, collectionPath, userId);
		const snapshot = await getDoc(reference);
		if (!snapshot.exists()) {
			return null;
		}
		return parseDocument(snapshot.data());
	};

	const save = async ({
		userId,
		ledger,
		collectedAt,
	}: {
		userId: string;
		ledger: StampLedger;
		collectedAt: number | null;
	}) => {
		const reference = doc(firestore, collectionPath, userId);
		const snapshot = await getDoc(reference);
		const existing = snapshot.exists()
			? parseDocument(snapshot.data())
			: null;
		const createdAt = existing?.createdAt ?? Date.now();
		const payload = toFirestorePayload({
			ledger,
			createdAt,
			lastCollectedAt: collectedAt ?? existing?.lastCollectedAt ?? null,
		});
		await setDoc(reference, payload);
	};

	return { getByUserId, save };
};

export { createStampRepository };
export type { StampDocument, StampRepository };
