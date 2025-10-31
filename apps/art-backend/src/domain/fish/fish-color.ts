import { z } from "zod";

import { AppError } from "../../errors/app-error.js";

export type HSVPixel = Readonly<{
	h: number;
	s: number;
	v: number;
}>;

type ColorExtractionContext = Readonly<{
	reason: string;
}>;

export class ColorExtractionError extends AppError {
	constructor(context: ColorExtractionContext) {
		super({
			message: "Unable to derive fish color",
			code: "COLOR_EXTRACTION_FAILED",
			name: "ColorExtractionError",
			context,
		});
	}
}

const pixelSchema = z.object({
	h: z
		.number()
		.min(0)
		.max(360)
		.refine((value) => value < 360, {
			message: "Hue must be less than 360 degrees",
		}),
	s: z.number().min(0).max(1),
	v: z.number().min(0).max(1),
});

type HistogramEntry = Readonly<{
	weight: number;
	sSum: number;
	vSum: number;
	count: number;
}>;

const hsvToRgb = (h: number, s: number, v: number) => {
	const c = v * s;
	const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
	const m = v - c;
	const segment = Math.floor(h / 60);
	const base =
		segment === 0
			? [c, x, 0]
			: segment === 1
				? [x, c, 0]
				: segment === 2
					? [0, c, x]
					: segment === 3
						? [0, x, c]
						: segment === 4
							? [x, 0, c]
							: [c, 0, x];

	return base.map((component) => Math.round((component + m) * 255)) as [
		number,
		number,
		number,
	];
};

const toHex = (value: number) =>
	value.toString(16).padStart(2, "0").toUpperCase();

const sanitizePixel = (pixel: HSVPixel) => {
	const validation = pixelSchema.safeParse(pixel);
	if (validation.success) {
		return validation.data;
	}
	const [issue] = validation.error.issues;
	throw new ColorExtractionError({
		reason: issue?.message ?? "Invalid pixel data",
	});
};

const bucketize = (pixels: HSVPixel[]) =>
	pixels.reduce<Map<number, HistogramEntry>>((map, rawPixel) => {
		const pixel = sanitizePixel(rawPixel);
		const bucket = Math.floor(pixel.h);
		const weight = pixel.s * pixel.v;
		const previous = map.get(bucket);
		const entry: HistogramEntry =
			previous === undefined
				? {
						weight,
						sSum: pixel.s,
						vSum: pixel.v,
						count: 1,
					}
				: {
						weight: previous.weight + weight,
						sSum: previous.sSum + pixel.s,
						vSum: previous.vSum + pixel.v,
						count: previous.count + 1,
					};
		map.set(bucket, entry);
		return map;
	}, new Map());

const clamp = (value: number, min: number, max: number) =>
	Math.min(Math.max(value, min), max);

const pickDominantBucket = (histogram: Map<number, HistogramEntry>) => {
	const entries = Array.from(histogram.entries());
	if (entries.length === 0) {
		throw new ColorExtractionError({
			reason: "No pixels available for color derivation",
		});
	}
	const sorted = entries.sort((a, b) => {
		if (a[1].weight === b[1].weight) {
			return a[0] - b[0];
		}
		return b[1].weight - a[1].weight;
	});
	const [bucket, data] = sorted[0];
	if (data.weight <= 0) {
		throw new ColorExtractionError({
			reason: "All pixels have zero weight",
		});
	}
	return { bucket, data };
};

export const deriveFishColor = (pixels: HSVPixel[]): string => {
	if (pixels.length === 0) {
		throw new ColorExtractionError({
			reason: "Pixel set is empty",
		});
	}

	const histogram = bucketize(pixels);
	const { bucket, data } = pickDominantBucket(histogram);
	const averageS = clamp(data.sSum / data.count, 0, 1);
	const averageV = clamp(data.vSum / data.count, 0, 1);
	const [r, g, b] = hsvToRgb(bucket, averageS, averageV);
	return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};
