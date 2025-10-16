import type { MaintenanceConfig } from "@/lib/config/remote-config";
import { getAdminFirestore } from "@/lib/firebase/admin";
import type { SupportedLocale } from "@/lib/i18n/messages";
import { translate } from "@/lib/i18n/messages";
import { logStampEvent } from "../services/stamp-event-logger";
import type { StampId, ValidatedStamp } from "./validate-token";
import { listStampDefinitions, validateStampToken } from "./validate-token";

export type ProgressStamp = {
	id: StampId;
	label: string;
	completed: boolean;
};

export type ProgressSnapshot = {
	stamps: ProgressStamp[];
	remaining: number;
	surveyCompleted: boolean;
	rewardEligible: boolean;
	maintenance?: {
		status: MaintenanceConfig["status"];
		messageJa?: string;
		messageEn?: string;
	};
};

export type AwardStampResult = {
	status: "granted" | "duplicate" | "invalid" | "maintenance";
	message: string;
	progress: ProgressSnapshot;
	maintenance: MaintenanceConfig;
};

export type AwardStampInput = {
	token: string;
	uid: string;
	locale: SupportedLocale;
};

export type AwardStampDependencies = {
	validateToken(
		token: string,
	): Promise<ValidatedStamp | null> | (ValidatedStamp | null);
	getMaintenanceConfig(): Promise<MaintenanceConfig>;
	loadProfile(uid: string): Promise<{
		uid: string;
		stamps: Record<StampId, boolean>;
		surveyCompleted: boolean;
		rewardEligible: boolean;
	}>;
	saveProfile(profile: {
		uid: string;
		stamps: Record<StampId, boolean>;
		surveyCompleted: boolean;
		rewardEligible: boolean;
	}): Promise<void>;
	logEvent(
		uid: string,
		payload: {
			stampId?: StampId;
			status: AwardStampResult["status"];
			maintenanceStatus?: MaintenanceConfig["status"];
		},
	): Promise<void>;
	projectProgress(profile: {
		uid: string;
		stamps: Record<StampId, boolean>;
		surveyCompleted: boolean;
		rewardEligible: boolean;
	}): Promise<Omit<ProgressSnapshot, "maintenance">>;
};

const computeRewardEligibility = (profile: {
	stamps: Record<StampId, boolean>;
	surveyCompleted: boolean;
}): boolean => {
	const allCollected = Object.values(profile.stamps).every(Boolean);
	return allCollected && (profile.surveyCompleted || profile.stamps.survey);
};

export const createAwardStampHandler = (
	dependencies: AwardStampDependencies,
) => {
	const awardStamp = async (
		input: AwardStampInput,
	): Promise<AwardStampResult> => {
		const maintenance = await dependencies.getMaintenanceConfig();
		const profile = await dependencies.loadProfile(input.uid);

		if (
			maintenance.status === "maintenance" &&
			!maintenance.whitelist.includes(input.uid)
		) {
			await dependencies.logEvent(input.uid, {
				status: "maintenance",
				maintenanceStatus: maintenance.status,
			});
			const progress = await dependencies.projectProgress(profile);
			return {
				status: "maintenance",
				message: translate("stampMaintenance", input.locale),
				progress: { ...progress, maintenance },
				maintenance,
			};
		}

		const validated = await dependencies.validateToken(input.token);
		if (!validated) {
			await dependencies.logEvent(input.uid, {
				status: "invalid",
				maintenanceStatus: maintenance.status,
			});
			const progress = await dependencies.projectProgress(profile);
			return {
				status: "invalid",
				message: translate("stampInvalid", input.locale),
				progress: { ...progress, maintenance },
				maintenance,
			};
		}

		if (profile.stamps[validated.stampId]) {
			await dependencies.logEvent(input.uid, {
				stampId: validated.stampId,
				status: "duplicate",
				maintenanceStatus: maintenance.status,
			});
			const progress = await dependencies.projectProgress(profile);
			return {
				status: "duplicate",
				message: translate("stampDuplicate", input.locale),
				progress: { ...progress, maintenance },
				maintenance,
			};
		}

		profile.stamps[validated.stampId] = true;
		if (validated.stampId === "survey") {
			profile.surveyCompleted = true;
		}
		profile.rewardEligible = computeRewardEligibility(profile);

		await dependencies.saveProfile(profile);
		await dependencies.logEvent(input.uid, {
			stampId: validated.stampId,
			status: "granted",
			maintenanceStatus: maintenance.status,
		});

		const progress = await dependencies.projectProgress(profile);
		return {
			status: "granted",
			message: translate("stampGranted", input.locale),
			progress: { ...progress, maintenance },
			maintenance,
		};
	};

	return { awardStamp };
};

export const awardStamp = async (
	_input: AwardStampInput,
): Promise<AwardStampResult> => {
	const handler = createAwardStampHandler(createServerDependencies());
	return handler.awardStamp(_input);
};

type FirestoreProfileDoc = {
	stamps?: Partial<Record<StampId, boolean>>;
	surveyCompleted?: boolean;
	rewardEligible?: boolean;
};

const createServerDependencies = (): AwardStampDependencies => {
	const firestore = getAdminFirestore();
	const stampDefinitions = listStampDefinitions();

	const blankStamps = stampDefinitions.reduce<Record<StampId, boolean>>(
		(acc, definition) => {
			acc[definition.id] = false;
			return acc;
		},
		{} as Record<StampId, boolean>,
	);

	const blankProfile = (uid: string) => ({
		uid,
		stamps: { ...blankStamps },
		surveyCompleted: false,
		rewardEligible: false,
	});

	const parseMaintenanceEnv = (): MaintenanceConfig => {
		const statusEnv = process.env.STAMP_APP_STATUS ?? "online";
		const status: MaintenanceConfig["status"] =
			statusEnv === "maintenance" || statusEnv === "degraded"
				? statusEnv
				: "online";
		const whitelist = (process.env.STAMP_APP_WHITELIST ?? "")
			.split(",")
			.map((entry) => entry.trim())
			.filter(Boolean);
		return {
			status,
			messageJa: process.env.STAMP_APP_MESSAGE_JA ?? "",
			messageEn: process.env.STAMP_APP_MESSAGE_EN ?? "",
			whitelist,
			rewardExpiryMinutes: Number.parseInt(
				process.env.REWARD_QR_EXPIRY_MINUTES ?? "120",
				10,
			),
			fetchedAt: Date.now(),
		};
	};

	return {
		validateToken: (token) => validateStampToken(token),
		getMaintenanceConfig: async () => parseMaintenanceEnv(),
		loadProfile: async (uid) => {
			const docRef = firestore.collection("users").doc(uid);
			const snapshot = await docRef.get();
			const profile = blankProfile(uid);
			if (snapshot.exists) {
				const data = snapshot.data() as FirestoreProfileDoc;
				if (data.stamps) {
					for (const [key, value] of Object.entries(data.stamps)) {
						if (value === undefined) continue;
						if (key in profile.stamps) {
							profile.stamps[key as StampId] = Boolean(value);
						}
					}
				}
				profile.surveyCompleted = Boolean(data.surveyCompleted);
				profile.rewardEligible = Boolean(data.rewardEligible);
			}
			return profile;
		},
		saveProfile: async (profile) => {
			const docRef = firestore.collection("users").doc(profile.uid);
			await docRef.set(
				{
					stamps: profile.stamps,
					surveyCompleted: profile.surveyCompleted,
					rewardEligible: profile.rewardEligible,
				},
				{ merge: true },
			);
		},
		logEvent: async (uid, payload) => {
			await logStampEvent(uid, {
				stampId: payload.stampId,
				status: payload.status,
				maintenanceStatus: payload.maintenanceStatus,
			});
		},
		projectProgress: async (profile) => {
			const stamps = stampDefinitions.map((definition) => ({
				id: definition.id,
				label: definition.labels.ja,
				labelJa: definition.labels.ja,
				labelEn: definition.labels.en,
				completed: Boolean(profile.stamps[definition.id]),
			}));
			const remaining = stamps.filter((stamp) => !stamp.completed).length;
			return {
				stamps,
				remaining,
				surveyCompleted: profile.surveyCompleted,
				rewardEligible: profile.rewardEligible,
			};
		},
	};
};
