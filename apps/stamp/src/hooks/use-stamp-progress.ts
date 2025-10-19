import useSWR from "swr";
import {
	createEmptyLedger,
	type StampCheckpoint,
	type StampLedger,
} from "@/domain/stamp";
import { createStampRepository } from "@/infra/stamp/stamp-repository";

const STAMP_PROGRESS_CACHE_KEY = "stamp-progress";

type StampIdentifier = StampCheckpoint;

type StampProgressCacheKey = [typeof STAMP_PROGRESS_CACHE_KEY, string];

type StampProgressSnapshot = StampLedger;

type StampProgressFetcher = (
	attendeeId: string,
) => Promise<StampProgressSnapshot>;

const createStampProgressKey = (attendeeId: string): StampProgressCacheKey => [
	STAMP_PROGRESS_CACHE_KEY,
	attendeeId,
];

const createEmptyStampProgress = (): StampProgressSnapshot =>
	createEmptyLedger();

const fetchStampProgress: StampProgressFetcher = async (attendeeId) => {
	const firebaseModule = await import("@/firebase");
	const repository = createStampRepository({
		firestore: firebaseModule.getFirestoreClient(),
	});
	const record = await repository.getByUserId(attendeeId);
	return record?.ledger ?? createEmptyStampProgress();
};

const useStampProgress = (attendeeId: string | null) => {
	const key = attendeeId === null ? null : createStampProgressKey(attendeeId);
	const fallbackData = createEmptyStampProgress();
	const fetcher =
		attendeeId === null ? undefined : () => fetchStampProgress(attendeeId);
	return useSWR(key, fetcher, {
		fallbackData,
		revalidateOnFocus: false,
	});
};

export {
	createEmptyStampProgress,
	createStampProgressKey,
	STAMP_PROGRESS_CACHE_KEY,
	useStampProgress,
};

export type {
	StampIdentifier,
	StampProgressCacheKey,
	StampProgressFetcher,
	StampProgressSnapshot,
};
