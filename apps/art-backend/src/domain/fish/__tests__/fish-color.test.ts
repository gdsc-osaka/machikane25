import { describe, expect, test } from "vitest";

import {
	ColorExtractionError,
	deriveFishColor,
	type HSVPixel,
} from "../fish-color.js";

const redPixels: HSVPixel[] = [
	{ h: 0, s: 1, v: 1 },
	{ h: 1, s: 0.9, v: 0.9 },
	{ h: 359, s: 0.8, v: 0.8 },
] as const;

describe("deriveFishColor", () => {
	test("returns representative hex color from hsv pixels", () => {
		const color = deriveFishColor(redPixels);

		expect(color).toBe("#FF0000");
	});

	test("throws ColorExtractionError when pixels array is empty", () => {
		expect(() => deriveFishColor([])).toThrowError(ColorExtractionError);
	});

	test("throws ColorExtractionError when hsv values are invalid", () => {
		expect(() => deriveFishColor([{ h: 400, s: 1, v: 1 }])).toThrowError(
			ColorExtractionError,
		);
	});
});
