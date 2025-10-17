import { describe, expect, test } from "vitest";
import {
	STAMP_ORDER,
	claimStamp,
	createEmptyLedger,
	mergeLedger,
	toProgress,
	type StampLedger,
} from "./stamp";

const withLedger = (
	overrides: Partial<StampLedger> = {},
): StampLedger => ({
	...createEmptyLedger(),
	...overrides,
});

describe("stamp domain", () => {
	test("collects a new checkpoint and updates progress", () => {
		const ledger = createEmptyLedger();
		const result = claimStamp(ledger, {
			checkpoint: "reception",
			collectedAt: 1_700_000_000_000,
		});

		expect(result.outcome).toBe("claimed");
		expect(result.ledger.reception).toBe(1_700_000_000_000);
		expect(result.progress.collected).toEqual(["reception"]);
		expect(result.progress.remaining).toEqual(
			STAMP_ORDER.filter((checkpoint) => checkpoint !== "reception"),
		);
	});

	test("returns duplicate outcome when checkpoint already collected", () => {
		const ledger = withLedger({ robot: 1_700_000_000_000 });
		const result = claimStamp(ledger, {
			checkpoint: "robot",
			collectedAt: 1_700_000_100_000,
		});

		expect(result.outcome).toBe("duplicate");
		expect(result.ledger.robot).toBe(1_700_000_000_000);
		expect(result.progress.collected).toContain("robot");
	});

	test("mergeLedger sanitizes invalid values", () => {
		const merged = mergeLedger({
			reception: 1_700_000_000_000,
			photobooth: null,
			art: Number.NaN,
			robot: 1_700_000_500_000,
			survey: "invalid" as unknown as number,
		});

		expect(merged.reception).toBe(1_700_000_000_000);
		expect(merged.photobooth).toBeNull();
		expect(merged.art).toBeNull();
		expect(merged.robot).toBe(1_700_000_500_000);
		expect(merged.survey).toBeNull();
	});

	test("toProgress calculates collected and remaining checkpoints", () => {
		const ledger = withLedger({
			reception: 1,
			photobooth: null,
			art: 2,
		});

		const progress = toProgress(ledger);
		expect(progress.collected).toEqual(["reception", "art"]);
		expect(progress.remaining).toEqual(["photobooth", "robot", "survey"]);
	});
});
