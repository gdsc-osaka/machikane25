import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

type MockTimestampInstance = {
	readonly value: number;
	toMillis: () => number;
};

const fromMillisSpy = vi.fn(
	(value: number) =>
		({ value, toMillis: () => value }) satisfies MockTimestampInstance,
);

vi.mock("firebase/firestore", () => ({
	Timestamp: class MockTimestamp {
		static fromMillis = fromMillisSpy;
	},
}));

let timestampUtils: typeof import("../timestamp")["timestampUtils"];

beforeAll(async () => {
	({ timestampUtils } = await import("../timestamp"));
});

beforeEach(() => {
	fromMillisSpy.mockClear();
});

describe("timestampUtils.fromMaybeMillis", () => {
	it("returns null when millis is null", () => {
		expect(timestampUtils.fromMaybeMillis(null)).toBeNull();
	});

	it("returns original value when provided FieldValue", () => {
		const fieldValue = { sentinel: true };
		expect(timestampUtils.fromMaybeMillis(fieldValue)).toBe(fieldValue);
	});

	it("converts numeric millis using Timestamp.fromMillis", () => {
		const millis = 1_700_000_000_000;
		const result = timestampUtils.fromMaybeMillis(
			millis,
		) as MockTimestampInstance;

		expect(fromMillisSpy).toHaveBeenCalledWith(millis);
		expect(result.toMillis()).toBe(millis);
	});
});
