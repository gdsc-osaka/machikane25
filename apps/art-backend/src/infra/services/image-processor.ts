import type { Sharp } from "sharp";

import type { ImageProcessor } from "../../application/ports.js";
import type { HSVPixel } from "../../domain/fish/fish-color.js";
import { ImageProcessingError } from "../../errors/infrastructure-errors.js";

type SharpFactory = (input: Buffer) => Sharp;

type SharpLoader = () => Promise<SharpFactory>;

const defaultSharpLoader: SharpLoader = (() => {
	let promise: Promise<SharpFactory> | undefined;
	return () => {
		if (promise === undefined) {
			promise = import("sharp").then((module) => {
				return module.default;
			});
		}
		return promise;
	};
})();

const toNormalized = (value: number) => value / 255;

const toHue = (
	max: number,
	delta: number,
	red: number,
	green: number,
	blue: number,
) => {
	if (delta === 0) {
		return 0;
	}
	const hueBase =
		max === red
			? (green - blue) / delta + (green < blue ? 6 : 0)
			: max === green
				? (blue - red) / delta + 2
				: (red - green) / delta + 4;
	return (hueBase % 6) * 60;
};

const toHSV = (red: number, green: number, blue: number): HSVPixel => {
	const r = toNormalized(red);
	const g = toNormalized(green);
	const b = toNormalized(blue);
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const delta = max - min;
	const hue = toHue(max, delta, r, g, b);
	const saturation = max === 0 ? 0 : delta / max;
	return Object.freeze({
		h: hue,
		s: saturation,
		v: max,
	});
};

const ensurePixels = (pixels: HSVPixel[]) => {
	if (pixels.length === 0) {
		throw new ImageProcessingError({
			message: "No pixels extracted from image",
			code: "HSV_EXTRACTION_FAILED",
			context: { reason: "empty" },
		});
	}
	return pixels;
};

export type ImageProcessorDeps = Readonly<{
	blurSigma: number;
	colorSampleSize: number;
	loadSharp?: SharpLoader;
}>;

export const createImageProcessor = (
	deps: ImageProcessorDeps,
): ImageProcessor => {
	const loadSharp = deps.loadSharp ?? defaultSharpLoader;

	const blur: ImageProcessor["blur"] = async (buffer) => {
		try {
			const factory = await loadSharp();
			const instance: Sharp = factory(buffer);
			return await instance.blur(deps.blurSigma).toBuffer();
		} catch (error) {
			throw new ImageProcessingError({
				message: "Failed to blur image",
				code: "IMAGE_BLUR_FAILED",
				context: { operation: "blur" },
				cause: error,
			});
		}
	};

	const extractHSV: ImageProcessor["extractHSV"] = async (buffer) => {
		try {
			const factory = await loadSharp();
			const size = Math.max(1, deps.colorSampleSize);
			const instance: Sharp = factory(buffer);
			const result = await instance
				.resize({
					width: size,
					height: size,
					fit: "inside",
				})
				.removeAlpha()
				.raw()
				.toBuffer({ resolveWithObject: true });

			if (result.info.channels < 3) {
				throw new ImageProcessingError({
					message: "Image lacks RGB channels",
					code: "HSV_EXTRACTION_FAILED",
					context: { channels: result.info.channels },
				});
			}

			const channelCount = result.info.channels;
			const pixelCount = result.data.length / channelCount;

			const hsvPixels = Array.from({ length: pixelCount }, (_, index) => {
				const offset = index * channelCount;
				const red = result.data[offset];
				const green = result.data[offset + 1];
				const blue = result.data[offset + 2];
				return toHSV(red, green, blue);
			});

			return ensurePixels(hsvPixels);
		} catch (error) {
			if (error instanceof ImageProcessingError) {
				throw error;
			}

			throw new ImageProcessingError({
				message: "Failed to extract HSV data",
				code: "HSV_EXTRACTION_FAILED",
				context: { operation: "extractHSV" },
				cause: error,
			});
		}
	};

	return Object.freeze({
		blur,
		extractHSV,
	});
};
