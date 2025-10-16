import { doc, getDoc } from "firebase/firestore";
import useSWR, { type SWRConfiguration } from "swr";
import { getFirestoreClient } from "@/infra/firebase/client";

export type StampId = "reception" | "photobooth" | "art" | "robot" | "survey";

export type StampProgress = {
	stamps: Partial<Record<StampId, Date>>;
	lastSignedInAt: Date | null;
	giftReceivedAt: Date | null;
	language: "ja" | "en";
	rewardQr: string | null;
};

const DEFAULT_PROGRESS: StampProgress = {
	stamps: {},
	lastSignedInAt: null,
	giftReceivedAt: null,
	language: "ja",
	rewardQr: null,
};

const parseTimestamp = (value: unknown): Date | null => {
	if (value && typeof value === "object" && "toDate" in value) {
		try {
			return (value as { toDate: () => Date }).toDate();
		} catch {
			return null;
		}
	}
	return null;
};

const fetchStampProgress = async (uid: string): Promise<StampProgress> => {
	const db = getFirestoreClient();
	const ref = doc(db, "users", uid);
	const snapshot = await getDoc(ref);

	if (!snapshot.exists()) {
		return DEFAULT_PROGRESS;
	}

	const data = snapshot.data() as Record<string, unknown>;
	const rawStamps = (data.stamps ?? {}) as Record<string, unknown>;
	const stamps: Partial<Record<StampId, Date>> = {};

	(Object.keys(rawStamps) as StampId[]).forEach((stamp) => {
		const parsed = parseTimestamp(rawStamps[stamp]);
		if (parsed) {
			stamps[stamp] = parsed;
		}
	});

	return {
		stamps,
		lastSignedInAt: parseTimestamp(data.lastSignedInAt),
		giftReceivedAt: parseTimestamp(data.giftReceivedAt),
		language: (data.language === "en" ? "en" : "ja") as "ja" | "en",
		rewardQr: typeof data.rewardQr === "string" ? data.rewardQr : null,
	};
};

const buildKey = (uid?: string | null) =>
	uid ? ["stamp-progress", uid] : null;

export const useStampProgress = (
	uid: string | null | undefined,
	config?: SWRConfiguration<StampProgress>,
) =>
	useSWR<StampProgress>(
		buildKey(uid),
		async ([, userId]) => fetchStampProgress(userId),
		{
			fallbackData: DEFAULT_PROGRESS,
			revalidateOnFocus: false,
			...config,
		},
	);
