import {
	collection,
	type DocumentData,
	doc,
	type FirestoreDataConverter,
	getDoc,
	Timestamp,
} from "firebase/firestore";
import { ResultAsync } from "neverthrow";
import { match } from "ts-pattern";
import {
	normalizeStampProgress,
	parseTimestamp,
	STAMP_IDS,
	type StampId,
	type StampProgress,
	StampProgressError,
	type StampProgressRepository,
	type StampProgressSnapshot,
} from "@/domain/stamps/progress";
import { getFirestoreClient } from "@/infra/firebase/client";

type FirestoreStampProgressDocument = {
	stamps?: Partial<Record<StampId, Timestamp | Date | null>>;
	lastSignedInAt?: Timestamp | Date | null;
	giftReceivedAt?: Timestamp | Date | null;
	language?: string | null;
	rewardQr?: string | null;
};

const stampProgressConverter: FirestoreDataConverter<
	StampProgress | StampProgressSnapshot
> = {
	toFirestore(model: StampProgress | StampProgressSnapshot): DocumentData {
		const toTimestamp = (value: unknown): Timestamp | null => {
			const parsed = parseTimestamp(value);
			return parsed ? Timestamp.fromDate(parsed) : null;
		};

		const stamps: Partial<Record<StampId, Timestamp>> = {};
		const source = model.stamps ?? {};

		for (const stampId of STAMP_IDS) {
			const maybe = source[stampId];
			const converted = toTimestamp(maybe);
			if (converted) {
				stamps[stampId] = converted;
			}
		}

		return {
			stamps,
			lastSignedInAt: toTimestamp(model.lastSignedInAt),
			giftReceivedAt: toTimestamp(model.giftReceivedAt),
			language: typeof model.language === "string" ? model.language : "ja",
			rewardQr: typeof model.rewardQr === "string" ? model.rewardQr : null,
		};
	},
	fromFirestore(snapshot): StampProgress | StampProgressSnapshot {
		const data = snapshot.data() as FirestoreStampProgressDocument;
		return {
			stamps: data.stamps,
			lastSignedInAt: data.lastSignedInAt,
			giftReceivedAt: data.giftReceivedAt,
			language: data.language,
			rewardQr: data.rewardQr,
		};
	},
};

let repositorySingleton: StampProgressRepository | null = null;

const createFirestoreStampProgressRepository = (): StampProgressRepository => {
	const db = getFirestoreClient();
	const users = collection(db, "users").withConverter(stampProgressConverter);

	return {
		getByUserId(userId: string) {
			const ref = doc(users, userId);

			return ResultAsync.fromPromise(
				(async () => {
					const snapshot = await getDoc(ref);
					if (!snapshot.exists()) {
						throw StampProgressError({
							reason: "not_found",
						});
					}
					return normalizeStampProgress(snapshot.data());
				})(),
				(error) =>
					match(error)
						.when((value): value is StampProgressError =>
							StampProgressError.is(value),
						)
						.with(true, (value) => value)
						.otherwise((value) =>
							StampProgressError({
								reason: "unknown",
								cause: value instanceof Error ? value.message : undefined,
							}),
						),
			);
		},
	};
};

export const resolveStampProgressRepository = (): StampProgressRepository => {
	if (!repositorySingleton) {
		repositorySingleton = createFirestoreStampProgressRepository();
	}
	return repositorySingleton;
};
