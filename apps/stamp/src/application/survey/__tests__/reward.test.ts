import { err, errAsync, ok, okAsync } from "neverthrow";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	RewardQrEncodingError,
	type RewardRecord,
	RewardRepositoryError,
} from "@/domain/reward";

const mocks = vi.hoisted(() => {
	const findByAttendeeId = vi.fn();
	const save = vi.fn();
	const createRewardRepository = vi.fn(() => ({
		findByAttendeeId: findByAttendeeId,
		save,
	}));
	const getFirebaseClients = vi.fn(() => ({ firestore: {} }));
	const generatePayload = vi.fn();
	const createRewardQrPayloadGenerator = vi.fn(() => generatePayload);
	return {
		findByAttendeeId,
		save,
		createRewardRepository,
		getFirebaseClients,
		generatePayload,
		createRewardQrPayloadGenerator,
	};
});

vi.mock("@/infra/reward/reward-repository", () => ({
	createRewardRepository: mocks.createRewardRepository,
}));

vi.mock("@/firebase", () => ({
	getFirebaseClients: mocks.getFirebaseClients,
}));

vi.mock("@/domain/reward", async () => {
	const actual =
		await vi.importActual<typeof import("@/domain/reward")>("@/domain/reward");
	return {
		...actual,
		createRewardQrPayloadGenerator: mocks.createRewardQrPayloadGenerator,
	};
});

const findByAttendeeIdMock = mocks.findByAttendeeId;
const saveMock = mocks.save;
const createRewardRepositoryMock = mocks.createRewardRepository;
const getFirebaseClientsMock = mocks.getFirebaseClients;
const generatePayloadMock = mocks.generatePayload;
const createRewardQrPayloadGeneratorMock = mocks.createRewardQrPayloadGenerator;

let loadSurveyReward: typeof import("../reward")["loadSurveyReward"];
let issueSurveyReward: typeof import("../reward")["issueSurveyReward"];

beforeEach(async () => {
	findByAttendeeIdMock.mockReset();
	saveMock.mockReset();
	createRewardRepositoryMock.mockClear();
	getFirebaseClientsMock.mockClear();
	generatePayloadMock.mockReset();
	createRewardQrPayloadGeneratorMock.mockClear();

	({ loadSurveyReward, issueSurveyReward } = await import("../reward"));
});

describe("loadSurveyReward", () => {
	it("returns pending snapshot when repository has no record", async () => {
		findByAttendeeIdMock.mockReturnValueOnce(okAsync(null));

		const snapshot = await loadSurveyReward("guest-1");

		expect(getFirebaseClientsMock).toHaveBeenCalled();
		expect(findByAttendeeIdMock).toHaveBeenCalledWith("guest-1");
		expect(snapshot.status).toBe("pending");
	});

	it("returns snapshot for existing reward record", async () => {
		const record: RewardRecord = {
			attendeeId: "guest-2",
			qrPayload: "qr-123",
			issuedAt: 1_700_000_000_000,
			redeemedAt: null,
		};
		findByAttendeeIdMock.mockReturnValueOnce(okAsync(record));

		const snapshot = await loadSurveyReward("guest-2");

		expect(snapshot.status).toBe("issued");
		expect(snapshot.qrPayload).toBe("qr-123");
	});

	it("throws when repository lookup fails", async () => {
		const error = RewardRepositoryError("read failed", {
			extra: { operation: "find" },
		});
		findByAttendeeIdMock.mockReturnValueOnce(errAsync(error));

		await expect(loadSurveyReward("guest-3")).rejects.toBe(error);
	});
});

describe("issueSurveyReward", () => {
	it("returns existing reward without issuing new one", async () => {
		const existing: RewardRecord = {
			attendeeId: "guest-5",
			qrPayload: "qr-existing",
			issuedAt: 1_700_000_000_000,
			redeemedAt: null,
		};
		findByAttendeeIdMock.mockReturnValueOnce(okAsync(existing));

		const snapshot = await issueSurveyReward("guest-5");

		expect(generatePayloadMock).not.toHaveBeenCalled();
		expect(saveMock).not.toHaveBeenCalled();
		expect(snapshot.status).toBe("issued");
		expect(snapshot.qrPayload).toBe("qr-existing");
	});

	it("issues new reward when none exists", async () => {
		const issuedAt = 1_700_000_111_000;
		const nowSpy = vi.spyOn(Date, "now").mockReturnValue(issuedAt);
		try {
			findByAttendeeIdMock.mockReturnValueOnce(okAsync(null));
			generatePayloadMock.mockReturnValueOnce(ok("encoded-payload"));
			saveMock.mockReturnValueOnce(okAsync(undefined));

			const snapshot = await issueSurveyReward("guest-6");

			expect(createRewardQrPayloadGeneratorMock).toHaveBeenCalledTimes(1);
			expect(generatePayloadMock).toHaveBeenCalledWith("guest-6", issuedAt);
			expect(saveMock).toHaveBeenCalledTimes(1);
			const savedRecord = saveMock.mock.calls[0]?.[0] as RewardRecord;
			expect(savedRecord.attendeeId).toBe("guest-6");
			expect(savedRecord.qrPayload).toBe("encoded-payload");
			expect(savedRecord.issuedAt).toBe(issuedAt);
			expect(snapshot.status).toBe("issued");
			expect(snapshot.qrPayload).toBe("encoded-payload");
		} finally {
			nowSpy.mockRestore();
		}
	});

	it("throws when QR payload generation fails", async () => {
		findByAttendeeIdMock.mockReturnValueOnce(okAsync(null));
		const failure = RewardQrEncodingError("encode failed", {
			extra: { reason: "encoding_failed" },
		});
		generatePayloadMock.mockReturnValueOnce(err(failure));

		await expect(issueSurveyReward("guest-7")).rejects.toBe(failure);
	});

	it("throws when repository save fails", async () => {
		const issuedAt = 1_700_000_222_000;
		const nowSpy = vi.spyOn(Date, "now").mockReturnValue(issuedAt);
		try {
			findByAttendeeIdMock.mockReturnValueOnce(okAsync(null));
			generatePayloadMock.mockReturnValueOnce(ok("encoded-payload"));
			const failure = RewardRepositoryError("save failed", {
				extra: { operation: "save" },
			});
			saveMock.mockReturnValueOnce(errAsync(failure));

			await expect(issueSurveyReward("guest-8")).rejects.toBe(failure);
		} finally {
			nowSpy.mockRestore();
		}
	});
});
