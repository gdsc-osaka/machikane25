import {
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { type RewardRecord, RewardRecordInvariantError } from "@/domain/reward";

class MockTimestamp {
	readonly millis: number;

	constructor(millis: number) {
		this.millis = millis;
	}

	toMillis() {
		return this.millis;
	}

	static fromMillis(value: number) {
		return new MockTimestamp(value);
	}
}

const fromMaybeMillisSpy = vi.fn<
	[number | null | MockTimestamp],
	MockTimestamp | null
>((value) => {
	if (value === null) {
		return null;
	}
	if (typeof value === "number") {
		return MockTimestamp.fromMillis(value);
	}
	return value;
});

vi.mock("firebase/firestore", () => ({
	Timestamp: MockTimestamp,
}));

vi.mock("@/infra/timestamp", () => ({
	timestampUtils: {
		fromMaybeMillis: fromMaybeMillisSpy,
	},
}));

let rewardConverter: typeof import("../reward-converter")["rewardConverter"];

beforeAll(async () => {
	({ rewardConverter } = await import("../reward-converter"));
});

beforeEach(() => {
	fromMaybeMillisSpy.mockClear();
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("rewardConverter.toFirestore", () => {
	const baseRecord: RewardRecord = {
		attendeeId: "guest-1",
		qrPayload: "qr-123",
		issuedAt: 1_700_000_000_000,
		redeemedAt: null,
	};

	it("converts numeric timestamps via timestampUtils", () => {
		const record = rewardConverter.toFirestore(baseRecord);

		expect(fromMaybeMillisSpy).toHaveBeenCalledWith(1_700_000_000_000);
		expect(fromMaybeMillisSpy).toHaveBeenCalledWith(null);
		expect(record.qrPayload).toBe("qr-123");
		expect(record.issuedAt).toBeInstanceOf(MockTimestamp);
		expect(record.redeemedAt).toBeNull();
	});

	it("throws invariant error when record validation fails", () => {
		try {
			rewardConverter.toFirestore({
				...baseRecord,
				qrPayload: "",
			});
			expect.fail("Expected rewardConverter.toFirestore to throw");
		} catch (error) {
			expect(RewardRecordInvariantError.isFn(error)).toBe(true);
		}
	});
});

describe("rewardConverter.fromFirestore", () => {
	it("builds reward record from snapshot data", () => {
		const snapshot = {
			id: "guest-2",
			data: () => ({
				issuedAt: new MockTimestamp(1_700_000_000_000),
				redeemedAt: new MockTimestamp(1_700_000_100_000),
				qrPayload: "qr-999",
			}),
		};

		const record = rewardConverter.fromFirestore(
			snapshot as unknown as import("firebase/firestore").QueryDocumentSnapshot<
				Record<string, unknown>
			>,
		);

		expect(record.attendeeId).toBe("guest-2");
		expect(record.issuedAt).toBe(1_700_000_000_000);
		expect(record.redeemedAt).toBe(1_700_000_100_000);
		expect(record.qrPayload).toBe("qr-999");
	});

	it("throws invariant error when snapshot data is invalid", () => {
		const nowSpy = vi.spyOn(Date, "now").mockReturnValue(1_234_567);
		const snapshot = {
			id: "guest-3",
			data: () => ({
				issuedAt: null,
				redeemedAt: null,
				qrPayload: "",
			}),
		};

		try {
			rewardConverter.fromFirestore(
				snapshot as unknown as import("firebase/firestore").QueryDocumentSnapshot<
					Record<string, unknown>
				>,
			);
			expect.fail("Expected rewardConverter.fromFirestore to throw");
		} catch (error) {
			expect(RewardRecordInvariantError.isFn(error)).toBe(true);
		}

		expect(nowSpy).toHaveBeenCalled();
	});
});
