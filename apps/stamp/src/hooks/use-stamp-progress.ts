import type { Timestamp } from "firebase/firestore";
import useSWR from "swr";

const STAMP_PROGRESS_CACHE_KEY = "stamp-progress";

type StampIdentifier = "reception" | "photobooth" | "art" | "robot" | "survey";

type StampProgressCacheKey = [typeof STAMP_PROGRESS_CACHE_KEY, string];

type StampProgressSnapshot = Record<StampIdentifier, Timestamp | null>;

type StampProgressFetcher = (
	attendeeId: string,
) => Promise<StampProgressSnapshot>;

const createStampProgressKey = (attendeeId: string): StampProgressCacheKey => [
	STAMP_PROGRESS_CACHE_KEY,
	attendeeId,
];

const createEmptyStampProgress = (): StampProgressSnapshot => ({
	art: null,
	photobooth: null,
	reception: null,
	robot: null,
	survey: null,
});

const fetchStampProgress: StampProgressFetcher = async () =>
	createEmptyStampProgress();

const useStampProgress = (attendeeId: string | null) => {
	const key = attendeeId === null ? null : createStampProgressKey(attendeeId);
	const fallbackData = createEmptyStampProgress();
	const fetcher = () =>
		attendeeId === null ? undefined : fetchStampProgress(attendeeId);
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
