import { beforeEach, describe, expect, it } from "vitest";
import {
	type AwardStampDependencies,
	type AwardStampResult,
	createAwardStampHandler,
} from "@/features/stamps/server/award-stamp";

type StampId = "reception" | "photobooth" | "art" | "robot" | "survey";

type FakeProfile = {
	uid: string;
	stamps: Record<StampId, boolean>;
	surveyCompleted: boolean;
	rewardEligible: boolean;
};

type FakeStore = {
	profiles: Map<string, FakeProfile>;
	events: Array<{ uid: string; stampId: string; status: string }>;
};

const TOKENS: Record<
	string,
	{ stampId: StampId; labels: Record<"ja" | "en", string> }
> = {
	"token-reception": {
		stampId: "reception",
		labels: { ja: "受付", en: "Reception" },
	},
	"token-photobooth": {
		stampId: "photobooth",
		labels: { ja: "フォトブース", en: "Photobooth" },
	},
};

const createStore = (): FakeStore => ({
	profiles: new Map(),
	events: [],
});

const createDependencies = (store: FakeStore): AwardStampDependencies => ({
	async validateToken(token) {
		const match = TOKENS[token];
		if (!match) {
			return null;
		}
		return { stampId: match.stampId, labels: match.labels };
	},
	async getMaintenanceConfig() {
		return {
			status: "online",
			messageJa: "",
			messageEn: "",
			whitelist: [],
			rewardExpiryMinutes: 120,
			fetchedAt: Date.now(),
		};
	},
	async loadProfile(uid) {
		let profile = store.profiles.get(uid);
		if (!profile) {
			profile = {
				uid,
				stamps: {
					reception: false,
					photobooth: false,
					art: false,
					robot: false,
					survey: false,
				},
				surveyCompleted: false,
				rewardEligible: false,
			};
			store.profiles.set(uid, profile);
		}
		return profile;
	},
	async saveProfile(profile) {
		store.profiles.set(profile.uid, profile);
	},
	async logEvent(uid, payload) {
		store.events.push({
			uid,
			stampId: payload.stampId ?? "unknown",
			status: payload.status,
		});
	},
	async projectProgress(profile) {
		const entries = Object.entries(profile.stamps).map(([id, completed]) => ({
			id,
			label: TOKENS[`token-${id}` as keyof typeof TOKENS]?.labels.en ?? id,
			completed,
		}));
		const remaining = entries.filter((entry) => !entry.completed).length;
		return {
			stamps: entries,
			remaining,
			surveyCompleted: profile.surveyCompleted,
			rewardEligible: profile.rewardEligible,
		};
	},
});

describe("awardStamp", () => {
	let store: FakeStore;
	let awardStamp: (input: {
		token: string;
		uid: string;
		locale: "ja" | "en";
	}) => Promise<AwardStampResult>;

	beforeEach(() => {
		store = createStore();
		const handler = createAwardStampHandler(createDependencies(store));
		awardStamp = handler.awardStamp;
	});

	it("grants a new stamp on first scan", async () => {
		const result = await awardStamp({
			token: "token-reception",
			uid: "user-1",
			locale: "ja",
		});

		expect(result.status).toBe("granted");
		expect(
			result.progress.stamps.find((stamp) => stamp.id === "reception")
				?.completed,
		).toBe(true);
		expect(store.events).toHaveLength(1);
		expect(result.progress.remaining).toBe(4);
	});

	it("returns duplicate when stamp already collected", async () => {
		await awardStamp({
			token: "token-reception",
			uid: "user-1",
			locale: "ja",
		});

		const result = await awardStamp({
			token: "token-reception",
			uid: "user-1",
			locale: "ja",
		});

		expect(result.status).toBe("duplicate");
		expect(store.events).toHaveLength(2);
	});

	it("rejects invalid token", async () => {
		const result = await awardStamp({
			token: "invalid-token",
			uid: "user-1",
			locale: "en",
		});

		expect(result.status).toBe("invalid");
		expect(store.events).toHaveLength(1);
	});
});
