import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	createBlankAttendeeProfile,
	markSurveyCompleted,
	computeStampCompletion,
	computeRewardEligibility,
	getAttendeeProfile,
	saveAttendeeProfile,
	type AttendeeProfile,
} from "../attendee-profile";

const mockListStampDefinitions = vi.hoisted(() =>
	vi.fn(() => [
		{ id: "reception", labels: { ja: "受付", en: "Reception" } },
		{ id: "photobooth", labels: { ja: "写真", en: "Photo" } },
		{ id: "art", labels: { ja: "アート", en: "Art" } },
		{ id: "robot", labels: { ja: "ロボット", en: "Robot" } },
		{ id: "survey", labels: { ja: "アンケート", en: "Survey" } },
	]),
);

const fireStoreDoc = vi.fn();
const fireStoreCollection = vi.fn(() => ({ doc: fireStoreDoc }));

const mockGetAdminFirestore = vi.hoisted(() =>
	vi.fn(() => ({
		collection: fireStoreCollection,
	})),
);

vi.mock("@/features/stamps/server/validate-token", () => ({
	listStampDefinitions: mockListStampDefinitions,
}));

vi.mock("@/lib/firebase/admin", () => ({
	getAdminFirestore: mockGetAdminFirestore,
}));

describe("attendee-profile model helpers", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		fireStoreDoc.mockReturnValue({
			get: vi.fn().mockResolvedValue({ exists: false }),
			set: vi.fn(),
		});
	});

	it("creates a blank profile with all default values", () => {
		const profile = createBlankAttendeeProfile("user-001");
		expect(profile.uid).toBe("user-001");
		expect(computeStampCompletion(profile)).toBe(false);
		expect(profile.rewardEligible).toBe(false);
		expect(profile.rewardQr).toBeNull();
	});

	it("computes reward eligibility only when all stamps and survey are complete", () => {
		const base = createBlankAttendeeProfile("user-002");
		const incomplete = computeRewardEligibility(base);
		expect(incomplete).toBe(false);

		const eligible = computeRewardEligibility({
			...base,
			stamps: {
				reception: true,
				photobooth: true,
				art: true,
				robot: true,
				survey: true,
			},
			surveyCompleted: true,
		});
		expect(eligible).toBe(true);
	});

	it("marks survey completion, stamps, and completion timestamp when appropriate", () => {
		const base = createBlankAttendeeProfile("user-003");
		const completed = markSurveyCompleted(
			{
				...base,
				stamps: {
					reception: true,
					photobooth: true,
					art: true,
					robot: true,
					survey: false,
				},
			},
			{ submissionId: "submission-123", submittedAt: 123_456 },
		);

		expect(completed.surveyCompleted).toBe(true);
		expect(completed.stamps.survey).toBe(true);
		expect(completed.completedAt).toBe(123_456);
		expect(completed.rewardEligible).toBe(true);
		expect(completed.surveySubmissionId).toBe("submission-123");
	});

	it("loads profile data from Firestore snapshots when available", async () => {
	const mockSnapshot = {
		exists: true,
		data: () => ({
			displayLanguage: "en",
			stamps: { reception: true, robot: true, extra: true },
			completedAt: { toMillis: () => 2000 },
			surveyCompleted: true,
			surveySubmittedAt: 3000,
			surveySubmissionId: "submission-xyz",
				rewardQr: {
					dataUrl: "data:image/png;base64,sample",
					generatedAt: { toMillis: () => 4000 },
					hash: "hash-value",
				},
				rewardEligible: true,
				rewardRedeemed: true,
				rewardRedeemedAt: 5000,
				maintenanceBypass: true,
			}),
		};

		fireStoreDoc.mockReturnValueOnce({
			get: vi.fn().mockResolvedValue(mockSnapshot),
			set: vi.fn(),
		});

		const profile = await getAttendeeProfile("user-004");

		expect(profile.displayLanguage).toBe("en");
		expect(profile.stamps.reception).toBe(true);
		expect(profile.stamps.photobooth).toBe(false);
		expect(profile.completedAt).toBe(2000);
		expect(profile.surveySubmittedAt).toBe(3000);
		expect(profile.rewardQr?.generatedAt).toBe(4000);
		expect(profile.rewardRedeemedAt).toBe(5000);
		expect(profile.maintenanceBypass).toBe(true);
	});

	it("returns a blank profile when no Firestore record exists", async () => {
		fireStoreDoc.mockReturnValueOnce({
			get: vi.fn().mockResolvedValue({ exists: false }),
			set: vi.fn(),
		});

		const profile = await getAttendeeProfile("missing-user");

		expect(profile.uid).toBe("missing-user");
		expect(Object.values(profile.stamps).every((flag) => flag === false)).toBe(true);
		expect(profile.surveyCompleted).toBe(false);
	});

	it("falls back when timestamp values are invalid", async () => {
		const failingTimestamp = {
			toMillis: vi.fn(() => {
				throw new Error("boom");
			}),
		};
		fireStoreDoc.mockReturnValueOnce({
			get: vi.fn().mockResolvedValue({
				exists: true,
				data: () => ({
					rewardQr: {
						dataUrl: "data:image/png;base64,broken",
						generatedAt: failingTimestamp,
					},
					rewardRedeemedAt: failingTimestamp,
				}),
			}),
			set: vi.fn(),
		});

		const profile = await getAttendeeProfile("user-invalid-ts");

		expect(profile.rewardQr?.generatedAt).toBeGreaterThan(0);
		expect(profile.rewardRedeemedAt).toBeNull();
	});

	it("persists profile data back to Firestore", async () => {
		const setSpy = vi.fn();
		fireStoreDoc.mockReturnValueOnce({
			get: vi.fn().mockResolvedValue({ exists: false }),
			set: setSpy,
		});

		const profile: AttendeeProfile = {
			uid: "user-005",
			displayLanguage: "en",
			stamps: {
				reception: true,
				photobooth: true,
				art: false,
				robot: true,
				survey: true,
			},
			completedAt: 6000,
			surveyCompleted: true,
			surveySubmittedAt: 6100,
			surveySubmissionId: "submission-abc",
			rewardQr: {
				dataUrl: "data:image/png;base64,sample",
				generatedAt: 6200,
				hash: "hash-value",
			},
			rewardEligible: true,
			rewardRedeemed: false,
			rewardRedeemedAt: null,
			maintenanceBypass: false,
		};

		await saveAttendeeProfile(profile);

		expect(setSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				surveySubmissionId: "submission-abc",
				rewardQr: expect.objectContaining({ hash: "hash-value" }),
			}),
			{ merge: true },
		);
	});

	it("maps reward QR to null when data url is missing", async () => {
		fireStoreDoc.mockReturnValueOnce({
			get: vi.fn().mockResolvedValue({
				exists: true,
				data: () => ({
					rewardQr: {
						generatedAt: 1234,
					},
					rewardRedeemedAt: "invalid",
				}),
			}),
			set: vi.fn(),
		});

		const profile = await getAttendeeProfile("user-missing-qr");
		expect(profile.rewardQr).toBeNull();
		expect(profile.rewardRedeemedAt).toBeNull();
	});

	it("falls back to defaults when snapshot data is undefined", async () => {
		fireStoreDoc.mockReturnValueOnce({
			get: vi.fn().mockResolvedValue({
				exists: true,
				data: () => undefined,
			}),
			set: vi.fn(),
		});

		const profile = await getAttendeeProfile("user-empty-doc");
		expect(profile.uid).toBe("user-empty-doc");
		expect(profile.rewardQr).toBeNull();
	});

	it("drops non-finite timestamps from Firestore payloads", async () => {
		fireStoreDoc.mockReturnValueOnce({
			get: vi.fn().mockResolvedValue({
				exists: true,
				data: () => ({
					completedAt: Number.POSITIVE_INFINITY,
					rewardQr: {
						dataUrl: "data:image/png;base64,fallback",
						generatedAt: { toMillis: () => Number.POSITIVE_INFINITY },
					},
				}),
			}),
			set: vi.fn(),
		});

		const profile = await getAttendeeProfile("user-infinite-ts");
		expect(profile.completedAt).toBeNull();
		expect(profile.rewardQr?.generatedAt).toBeGreaterThan(0);
	});

	it("persists null reward QR when the profile has none", async () => {
		const setSpy = vi.fn();
		fireStoreDoc.mockReturnValueOnce({
			get: vi.fn().mockResolvedValue({ exists: false }),
			set: setSpy,
		});

		const profile: AttendeeProfile = {
			uid: "user-006",
			displayLanguage: "ja",
			stamps: {
				reception: false,
				photobooth: false,
				art: false,
				robot: false,
				survey: false,
			},
			completedAt: null,
			surveyCompleted: false,
			surveySubmittedAt: null,
			surveySubmissionId: null,
			rewardQr: null,
			rewardEligible: false,
			rewardRedeemed: false,
			rewardRedeemedAt: null,
			maintenanceBypass: false,
		};

		await saveAttendeeProfile(profile);

		expect(setSpy).toHaveBeenCalledWith(
			expect.objectContaining({ rewardQr: null }),
			{ merge: true },
		);
	});
});
