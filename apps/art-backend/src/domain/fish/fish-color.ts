import { err, ok, type Result } from "neverthrow";
import {
	type ColorExtractionError,
	createColorExtractionError,
} from "./errors";

export type HSVPixel = Readonly<{
	h: number;
	s: number;
	v: number;
}>;

const HUE_SEGMENTS = 12;
const SEGMENT_SIZE = 360 / HUE_SEGMENTS;
const HUE_BUCKET_HEX = Object.freeze([
	"#FF4B4B",
	"#FF8A4B",
	"#FFD84B",
	"#D4FF4B",
	"#8BFF4B",
	"#4BFF8A",
	"#4BFFF3",
	"#4BCBFF",
	"#4B7CFF",
	"#8B4BFF",
	"#E04BFF",
	"#FF4BC0",
] as const);
const DEFAULT_HEX = "#A0AEC0";

const initialWeights = Object.freeze(
	Array.from({ length: HUE_SEGMENTS }, () => 0),
);

const normaliseHue = (hue: number) => {
	const modulo = hue % 360;
	return modulo < 0 ? modulo + 360 : modulo;
};

const isValidPixel = ({ h, s, v }: HSVPixel) =>
	Number.isFinite(h) &&
	Number.isFinite(s) &&
	Number.isFinite(v) &&
	h >= 0 &&
	h <= 360 &&
	s >= 0 &&
	s <= 1 &&
	v >= 0 &&
	v <= 1;

const addWeight = (
	weights: ReadonlyArray<number>,
	index: number,
	delta: number,
) =>
	weights.map((weight, weightIndex) =>
		weightIndex === index ? weight + delta : weight,
	);

export const deriveFishColor = (
	pixels: HSVPixel[],
): Result<string, ColorExtractionError> => {
	if (pixels.length === 0) {
		return err(
			createColorExtractionError(
				"color extraction failed: at least one pixel is required",
			),
		);
	}

	const invalidPixel = pixels.find((pixel) => !isValidPixel(pixel));

	if (invalidPixel) {
		return err(
			createColorExtractionError("color extraction failed: hue out of range", {
				pixel: invalidPixel,
			}),
		);
	}

	const weights = pixels.reduce(
		(acc, pixel) => {
			const hue = normaliseHue(pixel.h === 360 ? 0 : pixel.h);
			const bucket = Math.min(HUE_SEGMENTS - 1, Math.floor(hue / SEGMENT_SIZE));
			const delta = pixel.s * pixel.v;
			return addWeight(acc, bucket, delta);
		},
		[...initialWeights],
	);

	const { index: selectedBucket, weight: maxWeight } = weights.reduce(
		(best, weight, index) => (weight > best.weight ? { index, weight } : best),
		{ index: 0, weight: -1 },
	);

	if (maxWeight <= 0) {
		return ok(DEFAULT_HEX);
	}

	return ok(HUE_BUCKET_HEX[selectedBucket] ?? DEFAULT_HEX);
};
