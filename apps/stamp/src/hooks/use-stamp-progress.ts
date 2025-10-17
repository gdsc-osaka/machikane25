import useSWR, {
	type BareFetcher,
	type SWRConfiguration,
	type SWRResponse,
} from "swr";

type StampProgress = {
	completed: ReadonlyArray<string>;
	lastUpdatedAt: string | null;
};

type UseStampProgressOptions = {
	fetcher: BareFetcher<StampProgress>;
	fallbackData?: StampProgress;
	swr?: SWRConfiguration<StampProgress, unknown>;
};

const STAMP_PROGRESS_CACHE_KEY = "stamp-progress";

const DEFAULT_STAMP_PROGRESS: StampProgress = {
	completed: [],
	lastUpdatedAt: null,
};

const useStampProgress = (
	options: UseStampProgressOptions,
): SWRResponse<StampProgress, unknown> => {
	const configuration: SWRConfiguration<StampProgress, unknown> = {
		fallbackData: options.fallbackData ?? DEFAULT_STAMP_PROGRESS,
		revalidateOnFocus: false,
		keepPreviousData: true,
		...options.swr,
	};

	return useSWR<StampProgress>(
		STAMP_PROGRESS_CACHE_KEY,
		options.fetcher,
		configuration,
	);
};

export {
	DEFAULT_STAMP_PROGRESS,
	STAMP_PROGRESS_CACHE_KEY,
	useStampProgress,
};

export type { StampProgress, UseStampProgressOptions };
