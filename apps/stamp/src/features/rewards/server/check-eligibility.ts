"use server";

import {
	type AttendeeProfile,
	computeStampCompletion,
	getAttendeeProfile,
	saveAttendeeProfile,
} from "@/features/profile/models/attendee-profile";

export type EligibilityReason =
	| "missing-stamps"
	| "survey-incomplete"
	| "already-redeemed"
	| "qr-expired";

export type RewardEligibilityResult = {
	eligible: boolean;
	reasons: EligibilityReason[];
	profile: AttendeeProfile;
};

export type EvaluateOptions = {
	now?: number;
	expiryMinutes?: number;
};

const defaultExpiryMinutes = () =>
	Number.parseInt(process.env.REWARD_QR_EXPIRY_MINUTES ?? "120", 10);

export const evaluateRewardEligibility = (
	profile: AttendeeProfile,
	options: EvaluateOptions = {},
): RewardEligibilityResult => {
	const now = options.now ?? Date.now();
	const expiryMinutes = options.expiryMinutes ?? defaultExpiryMinutes();
	const expiryWindow = expiryMinutes * 60 * 1000;

	const reasons: EligibilityReason[] = [];

	if (!computeStampCompletion(profile)) {
		reasons.push("missing-stamps");
	}

	if (!profile.surveyCompleted) {
		reasons.push("survey-incomplete");
	}

	if (profile.rewardRedeemed) {
		reasons.push("already-redeemed");
	}

	if (profile.rewardQr) {
		const age = now - profile.rewardQr.generatedAt;
		if (Number.isFinite(age) && age > expiryWindow) {
			reasons.push("qr-expired");
		}
	}

	return {
		eligible: reasons.length === 0,
		reasons,
		profile,
	};
};

type RewardEligibilityDependencies = {
	loadProfile(uid: string): Promise<AttendeeProfile>;
	persistProfile(profile: AttendeeProfile): Promise<void>;
};

const createDependencies = (): RewardEligibilityDependencies => ({
	loadProfile: (uid) => getAttendeeProfile(uid),
	persistProfile: (profile) => saveAttendeeProfile(profile),
});

export const checkRewardEligibility = async (
	uid: string,
	dependencies: RewardEligibilityDependencies = createDependencies(),
): Promise<RewardEligibilityResult> => {
	const profile = await dependencies.loadProfile(uid);
	const result = evaluateRewardEligibility(profile);

	if (profile.rewardEligible !== result.eligible) {
		await dependencies.persistProfile({
			...profile,
			rewardEligible: result.eligible,
		});
	}

	return result;
};
