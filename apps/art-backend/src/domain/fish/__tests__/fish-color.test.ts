import { describe, expect, test } from "vitest";
import type { HSVPixel } from "../fish-color";
import { deriveFishColor } from "../fish-color";

const buildPixels = (pixels: HSVPixel[]): HSVPixel[] => pixels;

describe("deriveFishColor", () => {
	test("returns the predominant hue bucket as a hex color", () => {
		const pixels = buildPixels([
			{ h: 5, s: 0.9, v: 0.9 },
			{ h: 12, s: 0.85, v: 0.95 },
			{ h: 200, s: 0.2, v: 0.4 },
			{ h: 210, s: 0.1, v: 0.3 },
		]);

		const result = deriveFishColor(pixels);

		expect(result.isOk()).toBe(true);
		expect(result._unsafeUnwrap()).toBe("#FF4B4B");
	});

	test("weights hue buckets using saturation and value", () => {
		const pixels = buildPixels([
			{ h: 190, s: 0.95, v: 0.95 },
			{ h: 192, s: 0.9, v: 0.9 },
			{ h: 40, s: 0.2, v: 0.9 },
			{ h: 42, s: 0.2, v: 0.9 },
		]);

		const result = deriveFishColor(pixels);

		expect(result.isOk()).toBe(true);
		expect(result._unsafeUnwrap()).toBe("#4BFFF3");
	});

	test("returns an error when pixels are empty", () => {
		const result = deriveFishColor([]);

		expect(result.isErr()).toBe(true);
		const error = result._unsafeUnwrapErr();
		expect(error.type).toBe("color-extraction");
		expect(error.message).toContain("at least one");
	});

	test("returns an error when a pixel is outside expected range", () => {
		const pixels = buildPixels([
			{ h: -1, s: 0.5, v: 0.5 },
			{ h: 30, s: 0.5, v: 0.5 },
		]);

		const result = deriveFishColor(pixels);

		expect(result.isErr()).toBe(true);
		const error = result._unsafeUnwrapErr();
		expect(error.type).toBe("color-extraction");
		expect(error.message).toContain("hue");
	});
});
