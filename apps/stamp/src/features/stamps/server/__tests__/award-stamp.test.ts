import { afterEach, describe, expect, it, vi } from "vitest";
import type { MaintenanceConfig } from "@/lib/config/remote-config";
import { translate } from "@/lib/i18n/messages";
import { createAwardStampHandler } from "../award-stamp";
import type { AwardStampDependencies } from "../award-stamp";
import type { StampId, ValidatedStamp } from "../validate-token";

type Profile = {
	uid: string;
	stamps: Record<StampId, boolean>;
	surveyCompleted: boolean;
	rewardEligible: boolean;
};

const defaultMaintenance = (): MaintenanceConfig => ({
	status: "online",
	messageJa: "",
	messageEn: "",
	whitelist: [],
	rewardExpiryMinutes: 120,
	fetchedAt: 0,
});

const createProfile = (overrides: Partial<Profile> = {}): Profile => {
	const base: Profile = {
		uid: overrides.uid ?? "user-123",
		stamps: {
			reception: false,
			photobooth: false,
			art: false,
			robot: false,
			survey: false,
		},
		surveyCompleted: overrides.surveyCompleted ?? false,
		rewardEligible: overrides.rewardEligible ?? false,
	};

	if (overrides.stamps) {
		base.stamps = { ...base.stamps, ...overrides.stamps };
	}

	return base;
};

const createProjectProgressSpy = () =>
	vi
		.fn<
			NonNullable<AwardStampDependencies["projectProgress"]>
		>()
		.mockImplementation(async (state: Profile) => ({
			stamps: (Object.keys(state.stamps) as StampId[]).map((id) => ({
				id,
				label: id,
				completed: state.stamps[id],
			})),
			remaining: (Object.values(state.stamps) as boolean[]).filter(
				(value) => !value,
			).length,
			surveyCompleted: state.surveyCompleted,
			rewardEligible: state.rewardEligible,
		}));

const createDependencies = (options: {
	maintenance?: MaintenanceConfig;
	profile?: Profile;
	validateTokenResult?: ValidatedStamp | null;
} = {}) => {
	const maintenance = options.maintenance ?? defaultMaintenance();
	const profile = options.profile ?? createProfile();

	const validateToken = vi
		.fn<AwardStampDependencies["validateToken"]>()
		.mockImplementation(async () => options.validateTokenResult ?? null);

	const projectProgress = createProjectProgressSpy();

	const dependencies: AwardStampDependencies = {
		validateToken,
		getMaintenanceConfig: vi.fn().mockResolvedValue(maintenance),
		loadProfile: vi.fn().mockResolvedValue(profile),
		saveProfile: vi.fn(),
		logEvent: vi.fn(),
		projectProgress,
	};

	vi.mocked(dependencies.saveProfile).mockResolvedValue(undefined);
	vi.mocked(dependencies.logEvent).mockResolvedValue(undefined);

	return { dependencies, maintenance, profile, validateToken, projectProgress };
};

afterEach(() => {
	vi.restoreAllMocks();
});

describe("createAwardStampHandler", () => {
	it("returns maintenance status when awarding is paused for the user", async () => {
		const maintenance = { ...defaultMaintenance(), status: "maintenance" } as const;
		const { dependencies, profile, validateToken, projectProgress } = createDependencies({
			maintenance,
			validateTokenResult: {
				stampId: "reception",
				labels: { ja: "受付", en: "Reception" },
			},
		});

		const handler = createAwardStampHandler(dependencies);
		const result = await handler.awardStamp({
			token: "any-token",
			uid: profile.uid,
			locale: "ja",
		});

		expect(result.status).toBe("maintenance");
		expect(result.message).toBe(translate("stampMaintenance", "ja"));
		expect(result.maintenance).toBe(maintenance);
		expect(result.progress.maintenance).toBe(maintenance);
		expect(result.progress.remaining).toBe(5);
		expect(dependencies.logEvent).toHaveBeenCalledWith(profile.uid, {
			status: "maintenance",
			maintenanceStatus: "maintenance",
		});
		expect(validateToken).not.toHaveBeenCalled();
		expect(dependencies.saveProfile).not.toHaveBeenCalled();
		expect(projectProgress).toHaveBeenCalledWith(profile);
	});

	it("returns invalid status when the NFC token is not recognised", async () => {
		const { dependencies, maintenance, profile, projectProgress, validateToken } = createDependencies({
			validateTokenResult: null,
		});

		const handler = createAwardStampHandler(dependencies);
		const result = await handler.awardStamp({
			token: "bad-token",
			uid: profile.uid,
			locale: "en",
		});

		expect(result.status).toBe("invalid");
		expect(result.message).toBe(translate("stampInvalid", "en"));
		expect(result.progress.maintenance).toBe(maintenance);
		expect(validateToken).toHaveBeenCalledWith("bad-token");
		expect(dependencies.logEvent).toHaveBeenCalledWith(profile.uid, {
			status: "invalid",
			maintenanceStatus: maintenance.status,
		});
		expect(dependencies.saveProfile).not.toHaveBeenCalled();
		expect(projectProgress).toHaveBeenCalledWith(profile);
	});

	it("returns duplicate status when the stamp was already collected", async () => {
		const profile = createProfile({
			stamps: {
				reception: true,
				photobooth: false,
				art: false,
				robot: false,
				survey: false,
			},
		});
		const { dependencies, maintenance, validateToken } = createDependencies({
			profile,
			validateTokenResult: {
				stampId: "reception",
				labels: { ja: "受付", en: "Reception" },
			},
		});

		const handler = createAwardStampHandler(dependencies);
		const result = await handler.awardStamp({
			token: "token-reception",
			uid: profile.uid,
			locale: "en",
		});

		expect(result.status).toBe("duplicate");
		expect(result.message).toBe(translate("stampDuplicate", "en"));
		expect(result.progress.maintenance).toBe(maintenance);
		expect(validateToken).toHaveBeenCalledWith("token-reception");
		expect(dependencies.logEvent).toHaveBeenCalledWith(profile.uid, {
			stampId: "reception",
			status: "duplicate",
			maintenanceStatus: maintenance.status,
		});
		expect(dependencies.saveProfile).not.toHaveBeenCalled();
	});

	it("marks the stamp, persists the profile and returns success when awarding a new stamp", async () => {
		const profile = createProfile();
		const { dependencies, maintenance, projectProgress } = createDependencies({
			profile,
			validateTokenResult: {
				stampId: "robot",
				labels: { ja: "ロボット展示", en: "Robot Exhibit" },
			},
		});

		const handler = createAwardStampHandler(dependencies);
		const result = await handler.awardStamp({
			token: "token-robot",
			uid: profile.uid,
			locale: "ja",
		});

		expect(result.status).toBe("granted");
		expect(result.message).toBe(translate("stampGranted", "ja"));
		expect(profile.stamps.robot).toBe(true);
		expect(profile.rewardEligible).toBe(false);
		expect(result.progress.rewardEligible).toBe(false);
		expect(result.progress.maintenance).toBe(maintenance);
		expect(dependencies.saveProfile).toHaveBeenCalledWith(profile);
		expect(dependencies.logEvent).toHaveBeenCalledWith(profile.uid, {
			stampId: "robot",
			status: "granted",
			maintenanceStatus: maintenance.status,
		});
		expect(projectProgress).toHaveBeenCalledWith(profile);
	});

	it("updates survey status and reward eligibility when the survey stamp is granted last", async () => {
		const profile = createProfile({
			stamps: {
				reception: true,
				photobooth: true,
				art: true,
				robot: true,
				survey: false,
			},
		});
		const { dependencies, maintenance, projectProgress } = createDependencies({
			profile,
			validateTokenResult: {
				stampId: "survey",
				labels: { ja: "アンケート", en: "Survey" },
			},
		});

		const handler = createAwardStampHandler(dependencies);
		const result = await handler.awardStamp({
			token: "token-survey",
			uid: profile.uid,
			locale: "en",
		});

		expect(result.status).toBe("granted");
		expect(profile.stamps.survey).toBe(true);
		expect(profile.surveyCompleted).toBe(true);
		expect(profile.rewardEligible).toBe(true);
		expect(result.progress.surveyCompleted).toBe(true);
		expect(result.progress.rewardEligible).toBe(true);
		expect(result.progress.maintenance).toBe(maintenance);
		expect(dependencies.saveProfile).toHaveBeenCalledWith(profile);
		expect(dependencies.logEvent).toHaveBeenCalledWith(profile.uid, {
			stampId: "survey",
			status: "granted",
			maintenanceStatus: maintenance.status,
		});
		const [projectedProfile] = projectProgress.mock.calls[0];
		expect(projectedProfile.surveyCompleted).toBe(true);
		expect(projectedProfile.rewardEligible).toBe(true);
	});
});
