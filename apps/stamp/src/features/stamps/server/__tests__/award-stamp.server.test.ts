import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { StampId, ValidatedStamp } from "../validate-token";

const collectionMock = vi.fn();
const docMock = vi.fn();
const getMock = vi.fn();
const setMock = vi.fn();

const logStampEventMock = vi.fn();
const validateStampTokenMock =
	vi.fn<(token: string) => ValidatedStamp | null>();
const listStampDefinitionsMock =
	vi.fn<() => Array<{ id: StampId; labels: Record<"ja" | "en", string> }>>();

vi.mock("@/lib/firebase/admin", () => ({
	getAdminFirestore: () => ({
		collection: collectionMock,
	}),
}));

vi.mock("../../services/stamp-event-logger", () => ({
	logStampEvent: logStampEventMock,
}));

vi.mock("../validate-token", () => ({
	validateStampToken: (token: string) => validateStampTokenMock(token),
	listStampDefinitions: () => listStampDefinitionsMock(),
}));

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
	vi.resetModules();
	collectionMock.mockReset();
	docMock.mockReset();
	getMock.mockReset();
	setMock.mockReset();
	logStampEventMock.mockReset();
	validateStampTokenMock.mockReset();
	listStampDefinitionsMock.mockReset();

	collectionMock.mockReturnValue({ doc: docMock });
	docMock.mockReturnValue({ get: getMock, set: setMock });

	process.env = { ...ORIGINAL_ENV };
});

afterEach(() => {
	process.env = { ...ORIGINAL_ENV };
});

describe("awardStamp with server dependencies", () => {
	it("hydrates the profile from Firestore, parses maintenance env, and persists progress", async () => {
		process.env.STAMP_APP_STATUS = "maintenance";
		process.env.STAMP_APP_WHITELIST = " user-in , another ";
		process.env.STAMP_APP_MESSAGE_JA = "メンテ中";
		process.env.STAMP_APP_MESSAGE_EN = "Maintenance";
		process.env.REWARD_QR_EXPIRY_MINUTES = "45";

		const storedProfile = {
			stamps: {
				reception: true,
				photobooth: true,
				art: true,
				robot: false,
				survey: true,
				ignored: undefined,
				extra: true,
			},
			surveyCompleted: false,
			rewardEligible: false,
		};

		getMock.mockResolvedValue({
			exists: true,
			data: () => storedProfile,
		});
		setMock.mockResolvedValue(undefined);

		const definitions = (
			["reception", "photobooth", "art", "robot", "survey"] as const
		).map((id) => ({
			id,
			labels: { ja: `${id}-ja`, en: `${id}-en` },
		}));
		listStampDefinitionsMock.mockReturnValue(definitions);

		const robotStamp: ValidatedStamp = {
			stampId: "robot",
			labels: { ja: "robot-ja", en: "robot-en" },
		};
		validateStampTokenMock.mockImplementation((token: string) =>
			token === "token-robot" ? robotStamp : null,
		);
		logStampEventMock.mockResolvedValue(undefined);

		const { awardStamp } = await import("../award-stamp");

		const result = await awardStamp({
			token: "token-robot",
			uid: "user-in",
			locale: "ja",
		});

		expect(collectionMock).toHaveBeenCalledWith("users");
		expect(docMock).toHaveBeenCalledWith("user-in");
		expect(getMock).toHaveBeenCalled();
		expect(setMock).toHaveBeenCalledWith(
			{
				stamps: {
					reception: true,
					photobooth: true,
					art: true,
					robot: true,
					survey: true,
				},
				surveyCompleted: false,
				rewardEligible: true,
			},
			{ merge: true },
		);

		expect(logStampEventMock).toHaveBeenCalledWith("user-in", {
			stampId: "robot",
			status: "granted",
			maintenanceStatus: "maintenance",
		});

		expect(result.status).toBe("granted");
		expect(result.message).toBe("スタンプを獲得しました！");
		expect(result.maintenance).toMatchObject({
			status: "maintenance",
			messageJa: "メンテ中",
			messageEn: "Maintenance",
			whitelist: ["user-in", "another"],
			rewardExpiryMinutes: 45,
		});
		expect(result.progress.maintenance?.status).toBe("maintenance");
		expect(result.progress.rewardEligible).toBe(true);
		expect(result.progress.stamps).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: "robot",
					label: "robot-ja",
					labelJa: "robot-ja",
					labelEn: "robot-en",
					completed: true,
				}),
			]),
		);
	});

	it("creates a blank profile when the Firestore document is missing", async () => {
		delete process.env.STAMP_APP_STATUS;
		delete process.env.STAMP_APP_WHITELIST;
		delete process.env.STAMP_APP_MESSAGE_JA;
		delete process.env.STAMP_APP_MESSAGE_EN;
		delete process.env.REWARD_QR_EXPIRY_MINUTES;

		getMock.mockResolvedValue({
			exists: false,
			data: () => ({}),
		});
		setMock.mockResolvedValue(undefined);

		listStampDefinitionsMock.mockReturnValue([
			{ id: "reception", labels: { ja: "受付", en: "Reception" } },
			{ id: "survey", labels: { ja: "Survey", en: "Survey" } },
		]);

		validateStampTokenMock.mockReturnValue({
			stampId: "reception",
			labels: { ja: "受付", en: "Reception" },
		});
		logStampEventMock.mockResolvedValue(undefined);

		const { awardStamp } = await import("../award-stamp");

		const result = await awardStamp({
			token: "any-token",
			uid: "fresh-user",
			locale: "en",
		});

		expect(result.maintenance.status).toBe("online");
		expect(result.progress.surveyCompleted).toBe(false);
		expect(setMock).toHaveBeenCalledWith(
			{
				stamps: { reception: true, survey: false },
				surveyCompleted: false,
				rewardEligible: false,
			},
			{ merge: true },
		);
	});
});
