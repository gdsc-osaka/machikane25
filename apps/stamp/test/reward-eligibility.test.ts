import { describe, expect, it } from "vitest";
import type { AttendeeProfile } from "@/features/profile/models/attendee-profile";
import {
	type EligibilityReason,
	evaluateRewardEligibility,
} from "@/features/rewards/server/check-eligibility";

const baseProfile = (): AttendeeProfile => ({
	uid: "attendee-001",
	displayLanguage: "ja",
	stamps: {
		reception: true,
		photobooth: true,
		art: true,
		robot: true,
		survey: true,
	},
	completedAt: Date.now(),
	surveyCompleted: true,
	surveySubmittedAt: Date.now(),
	surveySubmissionId: "submission-1",
	rewardQr: {
		dataUrl: "data:image/png;base64,placeholder",
		generatedAt: Date.now(),
		hash: "hash",
	},
	rewardEligible: true,
	rewardRedeemed: false,
	rewardRedeemedAt: null,
	maintenanceBypass: false,
});

const reasons = (result: {
	reasons: EligibilityReason[];
}): EligibilityReason[] => result.reasons.sort();

describe("evaluateRewardEligibility", () => {
	it("returns eligible when requirements are satisfied", () => {
		const profile = baseProfile();
		const result = evaluateRewardEligibility(profile, {
			now: profile.completedAt ?? Date.now(),
		});

		expect(result.eligible).toBe(true);
		expect(result.reasons).toEqual([]);
	});

	it("returns missing-stamps reason when any stamp is incomplete", () => {
		const profile = baseProfile();
		profile.stamps.photobooth = false;

		const result = evaluateRewardEligibility(profile);
		expect(result.eligible).toBe(false);
		expect(reasons(result)).toEqual(["missing-stamps"]);
	});

	it("returns survey-incomplete when survey flag is false", () => {
		const profile = baseProfile();
		profile.surveyCompleted = false;

		const result = evaluateRewardEligibility(profile);
		expect(result.eligible).toBe(false);
		expect(reasons(result)).toEqual(["survey-incomplete"]);
	});

	it("returns already-redeemed when reward is already collected", () => {
		const profile = baseProfile();
		profile.rewardRedeemed = true;
		profile.rewardRedeemedAt = Date.now();

		const result = evaluateRewardEligibility(profile);
		expect(result.eligible).toBe(false);
		expect(reasons(result)).toEqual(["already-redeemed"]);
	});

	it("returns qr-expired when QR code is too old", () => {
		const profile = baseProfile();
		profile.rewardQr = {
			dataUrl: "data:image/png;base64,placeholder",
			generatedAt: Date.now() - 1000 * 60 * 200,
			hash: "hash",
		};

		const result = evaluateRewardEligibility(profile, {
			expiryMinutes: 30,
			now: Date.now(),
		});

		expect(result.eligible).toBe(false);
		expect(reasons(result)).toEqual(["qr-expired"]);
	});

	it("aggregates multiple failure reasons", () => {
		const profile = baseProfile();
		profile.stamps.survey = false;
		profile.surveyCompleted = false;

		const result = evaluateRewardEligibility(profile);

		expect(result.eligible).toBe(false);
		expect(reasons(result)).toEqual(["missing-stamps", "survey-incomplete"]);
	});
});
