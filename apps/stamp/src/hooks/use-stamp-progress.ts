import useSWR from "swr";
import { fetchStampProgressForCurrentUser } from "@/application/stamps/fetch-stamp-progress.client";

const STAMP_PROGRESS_CACHE_KEY = "stamp-progress";

type StampIdentifier = "reception" | "photobooth" | "art" | "robot" | "survey";

type StampProgressCacheKey = [typeof STAMP_PROGRESS_CACHE_KEY, string];

type StampProgressSnapshot = Record<StampIdentifier, number | null>;

type StampProgressFetcher = () => Promise<StampProgressSnapshot>;

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

const fetchStampProgress: StampProgressFetcher = async () => {
	const result = await fetchStampProgressForCurrentUser();
	return result.match(
		(progress) => {
			const empty = createEmptyStampProgress();
			if (progress === null) {
				return empty;
			}
			const ledger: StampProgressSnapshot = progress.collected.reduce(
				(ledger, checkpoint) => {
					ledger[checkpoint] = progress.lastCollectedAt;
					return ledger;
				},
				empty,
			);
			return ledger;
		},
		() => createEmptyStampProgress(),
	);
};

const useStampProgress = (attendeeId: string | null) => {
	const key = attendeeId === null ? null : createStampProgressKey(attendeeId);
	const fallbackData = createEmptyStampProgress();
	const fetcher = () => (key === null ? undefined : fetchStampProgress());
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
