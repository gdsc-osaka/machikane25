import { beforeEach, describe, expect, it, vi } from "vitest";
import * as profileModel from "@/features/profile/models/attendee-profile";
import {
	checkRewardEligibility,
	evaluateRewardEligibility,
	type RewardEligibilityResult,
} from "../check-eligibility";

const baseProfile = () => ({
	uid: "attendee-123",
	displayLanguage: "ja" as const,
	stamps: {
		reception: true,
		photobooth: true,
		art: true,
		robot: true,
		survey: true,
	},
	completedAt: 1_000,
	surveyCompleted: true,
	surveySubmittedAt: 1_000,
	surveySubmissionId: "submission-1",
	rewardQr: null,
	rewardEligible: true,
	rewardRedeemed: false,
	rewardRedeemedAt: null,
	maintenanceBypass: false,
});

describe("evaluateRewardEligibility", () => {
	beforeEach(() => {
		process.env.REWARD_QR_EXPIRY_MINUTES = "120";
	});

	it("identifies all reasons when requirements are missing", () => {
		const profile = {
			...baseProfile(),
			stamps: {
				reception: true,
				photobooth: false,
				art: true,
				robot: true,
				survey: false,
			},
			surveyCompleted: false,
			rewardRedeemed: true,
			rewardQr: {
				dataUrl: "data:image/png;base64,abc",
				generatedAt: Date.now() - 1_000_000_000,
				hash: "hash",
			},
		};

		const result = evaluateRewardEligibility(profile, {
			expiryMinutes: 30,
			now: Date.now(),
		});

		expect(result.eligible).toBe(false);
		expect(result.reasons).toEqual(
			expect.arrayContaining([
				"missing-stamps",
				"survey-incomplete",
				"already-redeemed",
				"qr-expired",
			]),
		);
	});
});

describe("checkRewardEligibility", () => {
	it("persists eligibility flag when value changes", async () => {
		const loadProfile = vi.fn().mockResolvedValue({
			...baseProfile(),
			rewardEligible: false,
		});
		const persistProfile = vi.fn().mockResolvedValue(undefined);

		const result = (await checkRewardEligibility("attendee-123", {
			loadProfile,
			persistProfile,
		})) as RewardEligibilityResult;

		expect(result.eligible).toBe(true);
		expect(persistProfile).toHaveBeenCalledWith(
			expect.objectContaining({ rewardEligible: true }),
		);
	});

	it("does not persist when eligibility remains unchanged", async () => {
		const profile = baseProfile();
		const loadProfile = vi.fn().mockResolvedValue(profile);
		const persistProfile = vi.fn();

		const result = await checkRewardEligibility("attendee-123", {
			loadProfile,
			persistProfile,
		});

		expect(result.eligible).toBe(true);
		expect(persistProfile).not.toHaveBeenCalled();
	});

	it("uses default Firestore-backed dependencies when not provided", async () => {
		const loadSpy = vi
			.spyOn(profileModel, "getAttendeeProfile")
			.mockResolvedValue({
				...baseProfile(),
				rewardEligible: false,
			});
		const saveSpy = vi
			.spyOn(profileModel, "saveAttendeeProfile")
			.mockResolvedValue(undefined);

		const result = await checkRewardEligibility("default-user");

		expect(loadSpy).toHaveBeenCalledWith("default-user");
		expect(saveSpy).toHaveBeenCalledWith(
			expect.objectContaining({ rewardEligible: true }),
		);
		expect(result.eligible).toBe(true);

		loadSpy.mockRestore();
		saveSpy.mockRestore();
	});
});
