import useSWR, { type SWRConfiguration } from "swr";
import { stampProgressService } from "@/application/stamps/stamp-progress-service";
import {
	emptyStampProgress,
	type StampProgress,
} from "@/domain/stamps/progress";

const buildKey = (uid?: string | null) =>
	uid ? ["stamp-progress", uid] : null;

export const useStampProgress = (
	uid: string | null | undefined,
	config?: SWRConfiguration<StampProgress>,
) =>
	useSWR<StampProgress>(
		buildKey(uid),
		async ([, userId]) => {
			const result = await stampProgressService.fetch(userId);
			if (result.isOk()) {
				return result.value;
			}
			throw result.error;
		},
		{
			fallbackData: emptyStampProgress(),
			revalidateOnFocus: false,
			...config,
		},
	);
