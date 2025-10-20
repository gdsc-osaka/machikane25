import { describe, expect, it, vi, beforeEach } from "vitest";
import { err, ok } from "neverthrow";
import { ZodError } from "zod";
import {
	createRewardQrPayloadGenerator,
	createRewardRecord,
	createRewardSnapshot,
	type RewardRecord,
	RewardQrEncodingError,
	RewardRecordInvariantError,
} from "../reward";

describe("createRewardSnapshot", () => {
	it("returns pending snapshot when record is null", () => {
		const snapshot = createRewardSnapshot(null);

		expect(snapshot.status).toBe("pending");
		expect(snapshot.qrPayload).toBeNull();
		expect(snapshot.issuedAt).toBeNull();
		expect(snapshot.redeemedAt).toBeNull();
	});

	it("maps issued record to issued snapshot", () => {
		const record: RewardRecord = {
			attendeeId: "guest-1",
			qrPayload: "qr-123",
			issuedAt: 1_700_000_000_000,
			redeemedAt: null,
		};

		const snapshot = createRewardSnapshot(record);

		expect(snapshot.status).toBe("issued");
		expect(snapshot.qrPayload).toBe("qr-123");
		expect(snapshot.issuedAt).toBe(1_700_000_000_000);
		expect(snapshot.redeemedAt).toBeNull();
	});

	it("maps redeemed record to redeemed snapshot", () => {
		const record: RewardRecord = {
			attendeeId: "guest-1",
			qrPayload: "qr-456",
			issuedAt: 1_700_000_000_000,
			redeemedAt: 1_700_000_123_000,
		};

		const snapshot = createRewardSnapshot(record);

		expect(snapshot.status).toBe("redeemed");
		expect(snapshot.redeemedAt).toBe(1_700_000_123_000);
	});
});

describe("createRewardQrPayloadGenerator", () => {
	const randomMock = vi.fn<[], string>();
	const encodeMock = vi.fn<[string], ReturnType<typeof ok<string>>>();

	beforeEach(() => {
		randomMock.mockReset();
		encodeMock.mockReset();
	});

	it("encodes attendee data using provided random and encoder", () => {
		randomMock.mockReturnValue("random-nonce");
		encodeMock.mockImplementation((raw) => {
			const parsed = JSON.parse(raw) as {
				v: string;
				id: string;
				issuedAt: number;
				nonce: string;
			};
			expect(parsed.v).toBe("1");
			expect(parsed.id).toBe("guest-42");
			expect(parsed.issuedAt).toBe(1_700_000_000_000);
			expect(parsed.nonce).toBe("random-nonce");
			return ok("encoded-payload");
		});

		const generate = createRewardQrPayloadGenerator({
			random: randomMock,
			encode: encodeMock,
		});

		const result = generate("guest-42", 1_700_000_000_000);

		expect(result.isOk()).toBe(true);
		expect(result._unsafeUnwrap()).toBe("encoded-payload");
		expect(randomMock).toHaveBeenCalledTimes(1);
		expect(encodeMock).toHaveBeenCalledTimes(1);
	});

	it("validates attendeeId and issuedAt inputs", () => {
		const generate = createRewardQrPayloadGenerator({
			random: () => "nonce",
			encode: (value) => ok(value),
		});

		expect(() => generate("", 100)).toThrowError(ZodError);
		expect(() => generate("guest-1", -10)).toThrowError(ZodError);
	});

	it("propagates encoder failures", () => {
		const failure = RewardQrEncodingError("Encoding failed", {
			extra: { reason: "encoding_failed" },
		});
		const generate = createRewardQrPayloadGenerator({
			random: () => "nonce",
			encode: () => err(failure),
		});

		const result = generate("guest-9", 10);

		expect(result.isErr()).toBe(true);
		expect(result._unsafeUnwrapErr()).toBe(failure);
	});
});

describe("createRewardRecord", () => {
	it("returns ok result when record passes schema validation", () => {
		const record: RewardRecord = {
			attendeeId: "guest-1",
			qrPayload: "qr-789",
			issuedAt: 1_700_000_000_000,
			redeemedAt: null,
		};

		const result = createRewardRecord(record);

		expect(result.isOk()).toBe(true);
		expect(result._unsafeUnwrap()).toEqual(record);
	});

	it("returns invariant error when record is invalid", () => {
		const result = createRewardRecord({
			attendeeId: "",
			qrPayload: "",
			issuedAt: -1,
			redeemedAt: null,
		});

		expect(result.isErr()).toBe(true);
		const error = result._unsafeUnwrapErr();
		expect(RewardRecordInvariantError.isFn(error)).toBe(true);
		expect(error.extra?.reason).toBe("invalid_record");
	});
});
