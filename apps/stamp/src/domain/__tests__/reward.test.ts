import { err, ok, type Result } from "neverthrow";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";
import {
	createRewardQrPayloadGenerator,
	createRewardRecord,
	createRewardSnapshot,
	RewardQrEncodingError,
	type RewardRecord,
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
	const randomMock = vi.fn<() => string>();
	const encodeMock =
		vi.fn<(arg: string) => Result<string, RewardQrEncodingError>>();

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

	it("encodes payload using default Buffer-based encoder", () => {
		const generate = createRewardQrPayloadGenerator();
		const issuedAt = 1_700_000_000_123;

		const result = generate("guest-default", issuedAt);

		expect(result.isOk()).toBe(true);
		const payload = result._unsafeUnwrap();
		const decoded = JSON.parse(
			Buffer.from(payload, "base64url").toString("utf-8"),
		) as {
			v: string;
			id: string;
			issuedAt: number;
			nonce: string;
		};
		expect(decoded.v).toBe("1");
		expect(decoded.id).toBe("guest-default");
		expect(decoded.issuedAt).toBe(issuedAt);
		expect(typeof decoded.nonce).toBe("string");
		expect(decoded.nonce.length).toBeGreaterThan(0);
	});

	it("falls back to global btoa encoding when Buffer is unavailable", () => {
		const globalAny = globalThis as typeof globalThis & {
			Buffer?: typeof Buffer;
			btoa?: (value: string) => string;
			crypto?: Crypto;
		};
		const bufferDescriptor = Object.getOwnPropertyDescriptor(
			globalAny,
			"Buffer",
		);
		const originalBuffer = bufferDescriptor?.get
			? bufferDescriptor.get.call(globalAny)
			: bufferDescriptor?.value;
		const btoaDescriptor = Object.getOwnPropertyDescriptor(globalAny, "btoa");
		const cryptoDescriptor = Object.getOwnPropertyDescriptor(
			globalAny,
			"crypto",
		);

		try {
			Object.defineProperty(globalAny, "Buffer", {
				configurable: true,
				value: undefined,
				writable: true,
			});
			Object.defineProperty(globalAny, "btoa", {
				configurable: true,
				value: (value: string) =>
					(originalBuffer as typeof Buffer)
						.from(value, "utf-8")
						.toString("base64"),
				writable: true,
			});
			Object.defineProperty(globalAny, "crypto", {
				configurable: true,
				value: {
					randomUUID: () => "nonce-fallback",
				},
				writable: true,
			});

			const generate = createRewardQrPayloadGenerator();
			const result = generate("guest-browser", 42);

			expect(result.isOk()).toBe(true);
			const payload = result._unsafeUnwrap();
			const decoded = JSON.parse(
				(originalBuffer as typeof Buffer)
					.from(payload, "base64url")
					.toString("utf-8"),
			) as { id: string; issuedAt: number; nonce: string };
			expect(decoded.id).toBe("guest-browser");
			expect(decoded.nonce).toBe("nonce-fallback");
		} finally {
			if (bufferDescriptor) {
				Object.defineProperty(globalAny, "Buffer", bufferDescriptor);
			} else {
				Reflect.deleteProperty(globalAny, "Buffer");
			}
			if (btoaDescriptor) {
				Object.defineProperty(globalAny, "btoa", btoaDescriptor);
			} else {
				Reflect.deleteProperty(globalAny, "btoa");
			}
			if (cryptoDescriptor) {
				Object.defineProperty(globalAny, "crypto", cryptoDescriptor);
			} else {
				Reflect.deleteProperty(globalAny, "crypto");
			}
		}
	});

	it("generates nonce using fallback UUID implementation when crypto is unavailable", () => {
		const globalAny = globalThis as typeof globalThis & { crypto?: Crypto };
		const cryptoDescriptor = Object.getOwnPropertyDescriptor(
			globalAny,
			"crypto",
		);
		const mathRandomValues = Array.from(
			{ length: 16 },
			(_, index) => index / 32,
		);
		let cursor = 0;
		const mathRandomSpy = vi
			.spyOn(Math, "random")
			.mockImplementation(
				() => mathRandomValues[cursor++] ?? mathRandomValues.at(-1) ?? 0,
			);

		try {
			Object.defineProperty(globalAny, "crypto", {
				configurable: true,
				value: undefined,
				writable: true,
			});

			const generate = createRewardQrPayloadGenerator({
				encode: (value) => ok(value),
			});

			const result = generate("guest-fallback", 123);

			expect(result.isOk()).toBe(true);
			const payload = JSON.parse(result._unsafeUnwrap()) as {
				id: string;
				issuedAt: number;
				nonce: string;
			};
			expect(payload.id).toBe("guest-fallback");
			expect(payload.issuedAt).toBe(123);
			expect(payload.nonce).toMatch(
				/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
			);
			expect(cursor).toBeGreaterThan(0);
		} finally {
			mathRandomSpy.mockRestore();
			if (cryptoDescriptor) {
				Object.defineProperty(globalAny, "crypto", cryptoDescriptor);
			} else {
				Reflect.deleteProperty(globalAny, "crypto");
			}
		}
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
