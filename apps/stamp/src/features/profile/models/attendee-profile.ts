"use server";

import type { Timestamp } from "firebase-admin/firestore";
import type { StampId } from "@/features/stamps/server/validate-token";
import { listStampDefinitions } from "@/features/stamps/server/validate-token";
import { getAdminFirestore } from "@/lib/firebase/admin";
import type { SupportedLocale } from "@/lib/i18n/messages";

export type RewardQrSnapshot = {
	dataUrl: string;
	generatedAt: number;
	hash?: string;
};

export type AttendeeProfile = {
	uid: string;
	displayLanguage: SupportedLocale;
	stamps: Record<StampId, boolean>;
	completedAt: number | null;
	surveyCompleted: boolean;
	surveySubmittedAt: number | null;
	surveySubmissionId: string | null;
	rewardQr: RewardQrSnapshot | null;
	rewardEligible: boolean;
	rewardRedeemed: boolean;
	rewardRedeemedAt: number | null;
	maintenanceBypass: boolean;
};

type FirestoreProfileDoc = {
	displayLanguage?: SupportedLocale;
	stamps?: Partial<Record<StampId, boolean>>;
	completedAt?: Timestamp | number | null;
	surveyCompleted?: boolean;
	surveySubmittedAt?: Timestamp | number | null;
	surveySubmissionId?: string | null;
	rewardQr?: {
		dataUrl?: string;
		generatedAt?: Timestamp | number;
		hash?: string;
	} | null;
	rewardEligible?: boolean;
	rewardRedeemed?: boolean;
	rewardRedeemedAt?: Timestamp | number | null;
	maintenanceBypass?: boolean;
};

const stampIds = (): StampId[] =>
	listStampDefinitions().map((definition) => definition.id);

const coerceTimestamp = (
	value: Timestamp | number | null | undefined,
): number | null => {
	if (value == null) {
		return null;
	}
	if (typeof value === "number") {
		return Number.isFinite(value) ? value : null;
	}
	if (typeof value === "object" && "toMillis" in value) {
		try {
			const millis = (value as Timestamp).toMillis();
			return Number.isFinite(millis) ? millis : null;
		} catch {
			return null;
		}
	}
	return null;
};

const normaliseStamps = (
	source?: Partial<Record<StampId, boolean>>,
): Record<StampId, boolean> => {
	const base = {} as Record<StampId, boolean>;
	for (const id of stampIds()) {
		base[id] = Boolean(source?.[id]);
	}
	return base;
};

export const createBlankAttendeeProfile = (uid: string): AttendeeProfile => ({
	uid,
	displayLanguage: "ja",
	stamps: normaliseStamps(),
	completedAt: null,
	surveyCompleted: false,
	surveySubmittedAt: null,
	surveySubmissionId: null,
	rewardQr: null,
	rewardEligible: false,
	rewardRedeemed: false,
	rewardRedeemedAt: null,
	maintenanceBypass: false,
});

export const computeStampCompletion = (
	profile: Pick<AttendeeProfile, "stamps">,
): boolean => {
	return Object.values(profile.stamps).every(Boolean);
};

export const computeRewardEligibility = (
	profile: Pick<AttendeeProfile, "stamps" | "surveyCompleted">,
): boolean => {
	return computeStampCompletion(profile) && profile.surveyCompleted;
};

export const markSurveyCompleted = (
	profile: AttendeeProfile,
	options: { submissionId: string; submittedAt: number },
): AttendeeProfile => {
	const updated: AttendeeProfile = {
		...profile,
		stamps: {
			...profile.stamps,
			survey: true,
		},
		surveyCompleted: true,
		surveySubmittedAt: options.submittedAt,
		surveySubmissionId: options.submissionId,
		rewardEligible: true,
	};

	if (!updated.completedAt && computeStampCompletion(updated)) {
		updated.completedAt = options.submittedAt;
	}

	updated.rewardEligible = computeRewardEligibility(updated);

	return updated;
};

const deserializeProfile = (
	uid: string,
	doc?: FirestoreProfileDoc,
): AttendeeProfile => {
	const base = createBlankAttendeeProfile(uid);
	if (!doc) {
		return base;
	}

	return {
		uid,
		displayLanguage: doc.displayLanguage ?? base.displayLanguage,
		stamps: normaliseStamps(doc.stamps),
		completedAt: coerceTimestamp(doc.completedAt),
		surveyCompleted: Boolean(doc.surveyCompleted),
		surveySubmittedAt: coerceTimestamp(doc.surveySubmittedAt),
		surveySubmissionId: doc.surveySubmissionId ?? null,
		rewardQr: doc.rewardQr?.dataUrl
			? {
					dataUrl: doc.rewardQr.dataUrl,
					generatedAt: coerceTimestamp(doc.rewardQr.generatedAt) ?? Date.now(),
					hash: doc.rewardQr.hash,
				}
			: null,
		rewardEligible: Boolean(doc.rewardEligible),
		rewardRedeemed: Boolean(doc.rewardRedeemed),
		rewardRedeemedAt: coerceTimestamp(doc.rewardRedeemedAt),
		maintenanceBypass: Boolean(doc.maintenanceBypass),
	};
};

const serializeProfile = (profile: AttendeeProfile): FirestoreProfileDoc => ({
	displayLanguage: profile.displayLanguage,
	stamps: profile.stamps,
	completedAt: profile.completedAt,
	surveyCompleted: profile.surveyCompleted,
	surveySubmittedAt: profile.surveySubmittedAt,
	surveySubmissionId: profile.surveySubmissionId,
	rewardQr: profile.rewardQr
		? {
				dataUrl: profile.rewardQr.dataUrl,
				generatedAt: profile.rewardQr.generatedAt,
				hash: profile.rewardQr.hash,
			}
		: null,
	rewardEligible: profile.rewardEligible,
	rewardRedeemed: profile.rewardRedeemed,
	rewardRedeemedAt: profile.rewardRedeemedAt,
	maintenanceBypass: profile.maintenanceBypass,
});

export const getAttendeeProfile = async (
	uid: string,
): Promise<AttendeeProfile> => {
	const firestore = getAdminFirestore();
	const snapshot = await firestore.collection("users").doc(uid).get();
	if (!snapshot.exists) {
		return createBlankAttendeeProfile(uid);
	}
	return deserializeProfile(uid, snapshot.data() as FirestoreProfileDoc);
};

export const saveAttendeeProfile = async (
	profile: AttendeeProfile,
): Promise<void> => {
	const firestore = getAdminFirestore();
	await firestore
		.collection("users")
		.doc(profile.uid)
		.set(serializeProfile(profile), { merge: true });
};
