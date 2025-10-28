import { describe, expect, test } from "vitest";

import type { HSVPixel } from "../../../domain/fish/fish-color.js";
import { ImageProcessingError } from "../../../errors/infrastructure-errors.js";
import { createImageProcessor } from "../image-processor.js";

const createBlurStub = (
	result: Buffer,
	sigmaLog: Readonly<{
		values: number[];
		buffers: Buffer[];
	}>,
) => {
	return async () => {
		return (buffer: Buffer) => {
			sigmaLog.buffers.push(buffer);
			return Object.freeze({
				blur: (sigma: number) => {
					sigmaLog.values.push(sigma);
					return Object.freeze({
						toBuffer: () => Promise.resolve(result),
					});
				},
				resize: () =>
					Object.freeze({
						removeAlpha: () =>
							Object.freeze({
								raw: () =>
									Object.freeze({
										toBuffer: () =>
											Promise.resolve({
												data: Buffer.alloc(0),
												info: {
													width: 0,
													height: 0,
													channels: 3,
													premultiplied: false,
													size: 0,
												},
											}),
									}),
							}),
					}),
			});
		};
	};
};

const createExtractStub = (pixels: Buffer, channels: number) => {
	return async () => {
		return () =>
			Object.freeze({
				blur: () =>
					Object.freeze({
						toBuffer: () => Promise.resolve(Buffer.alloc(0)),
					}),
				resize: () =>
					Object.freeze({
						removeAlpha: () =>
							Object.freeze({
								raw: () =>
									Object.freeze({
										toBuffer: () =>
											Promise.resolve({
												data: pixels,
												info: {
													width: 1,
													height: pixels.length / channels,
													channels,
													premultiplied: false,
													size: pixels.length,
												},
											}),
									}),
							}),
					}),
			});
	};
};

describe("createImageProcessor", () => {
	test("blurs image using configured sigma", async () => {
		const blurred = Buffer.from("blurred");
		const sigmaValues: number[] = [];
		const sigmaBuffers: Buffer[] = [];
		const sigmaLog = {
			values: sigmaValues,
			buffers: sigmaBuffers,
		};
		const processor = createImageProcessor({
			blurSigma: 2,
			colorSampleSize: 1,
			loadSharp: createBlurStub(blurred, sigmaLog),
		});

		const original = Buffer.from("original");
		const result = await processor.blur(original);

		expect(result).toEqual(blurred);
		expect(sigmaLog.buffers).toEqual([original]);
		expect(sigmaLog.values).toEqual([2]);
	});

	test("extracts HSV pixels from sampled image", async () => {
		const pixels = Buffer.from([255, 0, 0, 0, 255, 0]);
		const processor = createImageProcessor({
			blurSigma: 1,
			colorSampleSize: 2,
			loadSharp: createExtractStub(pixels, 3),
		});

		const hsv = await processor.extractHSV(Buffer.from("source"));

		const expected: ReadonlyArray<HSVPixel> = [
			{ h: 0, s: 1, v: 1 },
			{ h: 120, s: 1, v: 1 },
		];

		expect(hsv).toEqual(expected);
	});

	test("wraps blur failures in ImageProcessingError", async () => {
		const processor = createImageProcessor({
			blurSigma: 1,
			colorSampleSize: 1,
			loadSharp: async () => {
				return () =>
					Object.freeze({
						blur: () => {
							throw new Error("blur failed");
						},
						resize: () =>
							Object.freeze({
								removeAlpha: () =>
									Object.freeze({
										raw: () =>
											Object.freeze({
												toBuffer: () =>
													Promise.resolve({
														data: Buffer.alloc(0),
														info: {
															width: 0,
															height: 0,
															channels: 3,
															premultiplied: false,
															size: 0,
														},
													}),
											}),
									}),
							}),
					});
			},
		});

		await expect(processor.blur(Buffer.from("source"))).rejects.toThrow(
			ImageProcessingError,
		);
	});

	test("wraps HSV extraction failures", async () => {
		const processor = createImageProcessor({
			blurSigma: 1,
			colorSampleSize: 1,
			loadSharp: async () => {
				return () =>
					Object.freeze({
						blur: () =>
							Object.freeze({
								toBuffer: () => Promise.resolve(Buffer.alloc(0)),
							}),
						resize: () =>
							Object.freeze({
								removeAlpha: () =>
									Object.freeze({
										raw: () =>
											Object.freeze({
												toBuffer: () => {
													throw new Error("raw failed");
												},
											}),
									}),
							}),
					});
			},
		});

		await expect(processor.extractHSV(Buffer.from("source"))).rejects.toThrow(
			ImageProcessingError,
		);
	});
});
