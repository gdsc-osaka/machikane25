import {
	collection,
	doc,
	type Firestore,
	getDoc,
	setDoc,
} from "firebase/firestore";
import { ResultAsync } from "neverthrow";
import { errorBuilder, type InferError } from "obj-err";
import { z } from "zod";
import type { StampLedger } from "@/domain/stamp";
import {
	type StampLedgerRecord,
	stampLedgerConverter,
} from "./stamp-converter";

const USERS_COLLECTION = "users";

const StampRepositoryError = errorBuilder(
	"StampRepositoryError",
	z.object({
		operation: z.union([z.literal("get"), z.literal("save")]),
	}),
);
type StampRepositoryError = InferError<typeof StampRepositoryError>;

type StampDocument = StampLedgerRecord & { userId: string };

type SaveStampInput = {
	userId: string;
	ledger: StampLedger;
	collectedAt: number | null;
	createdAt?: number;
	lastCollectedAt?: number | null;
};

type StampRepository = {
	getByUserId: (
		userId: string,
	) => ResultAsync<StampDocument | null, StampRepositoryError>;
	save: (input: SaveStampInput) => ResultAsync<void, StampRepositoryError>;
};

const createStampRepository = (firestore: Firestore): StampRepository => {
	const usersCollection = collection(firestore, USERS_COLLECTION).withConverter(
		stampLedgerConverter,
	);

	const getByUserId = (
		userId: string,
	): ResultAsync<StampDocument | null, StampRepositoryError> =>
		ResultAsync.fromPromise(getDoc(doc(usersCollection, userId)), (cause) =>
			StampRepositoryError("Failed to load stamp ledger.", {
				cause,
				extra: { operation: "get" },
			}),
		).map((document) => {
			if (!document.exists()) {
				return null;
			}
			const payload = document.data();
			return {
				userId: document.id,
				ledger: payload.ledger,
				createdAt: payload.createdAt,
				lastCollectedAt: payload.lastCollectedAt,
			};
		});

	const save = ({
		userId,
		ledger,
		collectedAt,
		createdAt,
		lastCollectedAt,
	}: SaveStampInput): ResultAsync<void, StampRepositoryError> => {
		const resolvedCreatedAt = createdAt ?? collectedAt ?? Date.now();
		const resolvedLastCollectedAt = collectedAt ?? lastCollectedAt ?? null;
		const document: StampLedgerRecord = {
			ledger,
			createdAt: resolvedCreatedAt,
			lastCollectedAt: resolvedLastCollectedAt,
		};

		return ResultAsync.fromPromise(
			setDoc(doc(usersCollection, userId), document, { merge: true }),
			(cause) =>
				StampRepositoryError("Failed to persist stamp ledger.", {
					cause,
					extra: { operation: "save" },
				}),
		);
	};

	return {
		getByUserId,
		save,
	};
};

export { StampRepositoryError, createStampRepository };
export type { SaveStampInput, StampDocument, StampRepository };
