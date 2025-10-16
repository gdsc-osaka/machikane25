import { beforeEach, describe, expect, it } from "vitest";
import {
	type AwardStampDependencies,
	type AwardStampResult,
	createAwardStampHandler,
} from "../award-stamp";

type StampId = "reception" | "photobooth" | "art" | "robot" | "survey";

type FakeProfile = {
	uid: string;
	stamps: Record<StampId, boolean>;
	surveyCompleted: boolean;
	rewardEligible: boolean;
};

type FakeStore = {
	profiles: Map<string, FakeProfile>;
	events: Array<{ uid: string; status: string }>;
};

const TOKENS: Record<string, StampId> = {
	"token-reception": "reception",
	"token-photobooth": "photobooth",
};

const createStore = (): FakeStore => ({
	profiles: new Map(),
	events: [],
});

const createDependencies = (store: FakeStore): AwardStampDependencies => ({
	validateToken: async (token) => {
		const stampId = TOKENS[token];
		if (!stampId) {
			return null;
		}
		return {
			stampId,
			labels: { ja: "スタンプ", en: "Stamp" },
		};
	},
	getMaintenanceConfig: async () => ({
		status: "online",
		messageJa: "",
		messageEn: "",
		whitelist: [],
		rewardExpiryMinutes: 120,
		fetchedAt: Date.now(),
	}),
	loadProfile: async (uid) => {
		const existing = store.profiles.get(uid);
		if (existing) {
			return existing;
		}
		const blank: FakeProfile = {
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
		store.profiles.set(uid, blank);
		return blank;
	},
	saveProfile: async (profile) => {
		store.profiles.set(profile.uid, profile);
	},
	logEvent: async (uid, payload) => {
		store.events.push({ uid, status: payload.status });
	},
	projectProgress: async (profile) => ({
		stamps: Object.entries(profile.stamps).map(([id, completed]) => ({
			id: id as StampId,
			label: id,
			completed,
		})),
		remaining: Object.values(profile.stamps).filter((value) => !value).length,
		surveyCompleted: profile.surveyCompleted,
		rewardEligible: profile.rewardEligible,
	}),
});

describe("createAwardStampHandler", () => {
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

	it("grants a new stamp and records an event", async () => {
		const result = await awardStamp({
			token: "token-reception",
			uid: "uid-1",
			locale: "ja",
		});

		expect(result.status).toBe("granted");
		expect(
			result.progress.stamps.find((entry) => entry.id === "reception")
				?.completed,
		).toBe(true);
		expect(store.events).toEqual([{ uid: "uid-1", status: "granted" }]);
	});

	it("returns duplicate when stamp already granted", async () => {
		await awardStamp({ token: "token-reception", uid: "uid-1", locale: "ja" });
		store.events = [];

		const result = await awardStamp({
			token: "token-reception",
			uid: "uid-1",
			locale: "ja",
		});

		expect(result.status).toBe("duplicate");
		expect(store.events).toEqual([{ uid: "uid-1", status: "duplicate" }]);
	});

	it("returns invalid when token is unknown", async () => {
		const result = await awardStamp({
			token: "invalid",
			uid: "uid-1",
			locale: "en",
		});

		expect(result.status).toBe("invalid");
	});
});
