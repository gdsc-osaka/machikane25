import { describe, expect, it, vi } from "vitest";
import { createSubmitSurveyService } from "@/application/survey/submit-survey";

type SurveyAnswers = {
	ratingPhotobooth: number;
	ratingAquarium: number;
	ratingStampRally: number;
	freeComment: string | null;
};

type SurveyLedgerRecord = {
	attendeeId: string;
	completedAt: number;
	responseId: string;
};

type RewardRecord = {
	attendeeId: string;
	qrPayload: string;
	issuedAt: number;
	redeemedAt: number | null;
};

type Dependencies = Parameters<typeof createSubmitSurveyService>[0];

const createClock = (seed = 1_700_001_000_000) => {
	const state = { current: seed };
	return () => {
		const next = state.current + 1_000;
		state.current = next;
		return next;
	};
};

const createDependencies = () => {
	const surveyRecords: Array<SurveyLedgerRecord> = [];
	const rewardStore = new Map<string, RewardRecord>();

	const markCompleted = vi.fn<
		({
			attendeeId,
			completedAt,
			responseId,
		}: SurveyLedgerRecord) => Promise<void>
	>(async ({ attendeeId, completedAt, responseId }) => {
		surveyRecords.push({ attendeeId, completedAt, responseId });
	});

	const findByAttendeeId = vi.fn<
		(attendeeId: string) => Promise<RewardRecord | null>
	>(async (attendeeId) => rewardStore.get(attendeeId) ?? null);

	const saveReward = vi.fn<(record: RewardRecord) => Promise<void>>(
		async (record) => {
			rewardStore.set(record.attendeeId, record);
		},
	);

	const dependencies: Dependencies = {
		surveyLedger: {
			markCompleted,
		},
		rewards: {
			findByAttendeeId,
			save: saveReward,
		},
		generateQrPayload: (attendeeId: string) => `qr-${attendeeId}`,
		clock: createClock(),
	};

	return {
		dependencies,
		markCompleted,
		saveReward,
		findByAttendeeId,
		rewardStore,
	};
};

describe("createSubmitSurveyService", () => {
	const answers: SurveyAnswers = {
		ratingPhotobooth: 5,
		ratingAquarium: 4,
		ratingStampRally: 5,
		freeComment: "Loved the robot exhibit!",
	};

	it("persists survey completion and issues a reward when none exists", async () => {
		const { dependencies, markCompleted, saveReward } = createDependencies();
		const service = createSubmitSurveyService(dependencies);

		const result = await service.submit({
			attendeeId: "guest-21",
			answers,
			responseId: "response-guest-21",
		});

		expect(markCompleted).toHaveBeenCalledWith({
			attendeeId: "guest-21",
			completedAt: 1_700_001_001_000,
			responseId: "response-guest-21",
		});

		expect(saveReward).toHaveBeenCalledWith({
			attendeeId: "guest-21",
			qrPayload: "qr-guest-21",
			issuedAt: 1_700_001_002_000,
			redeemedAt: null,
		});

		expect(result).toEqual({
			attendeeId: "guest-21",
			surveyStatus: "submitted",
			rewardStatus: "issued",
			rewardQr: "qr-guest-21",
		});
	});

	it("returns existing reward without saving a duplicate record", async () => {
		const {
			dependencies,
			markCompleted,
			saveReward,
			rewardStore,
			findByAttendeeId,
		} = createDependencies();

		const issuedAt = 1_700_002_000_000;
		const existingReward: RewardRecord = {
			attendeeId: "guest-99",
			qrPayload: "qr-guest-99",
			issuedAt,
			redeemedAt: null,
		};
		rewardStore.set("guest-99", existingReward);

		const service = createSubmitSurveyService(dependencies);

		const result = await service.submit({
			attendeeId: "guest-99",
			answers,
			responseId: "response-guest-99",
		});

		expect(markCompleted).toHaveBeenCalledWith({
			attendeeId: "guest-99",
			completedAt: 1_700_001_001_000,
			responseId: "response-guest-99",
		});
		expect(saveReward).not.toHaveBeenCalled();
		expect(findByAttendeeId).toHaveBeenCalledTimes(1);
		expect(result).toEqual({
			attendeeId: "guest-99",
			surveyStatus: "submitted",
			rewardStatus: "issued",
			rewardQr: "qr-guest-99",
		});
	});
});
