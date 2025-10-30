import { describe, expect, test } from "vitest";

import { createPhoto, PhotoValidationError, validatePhoto } from "../photo.js";

const buffer = Buffer.from("photodata");
const meta = {
	mimeType: "image/png",
	size: buffer.byteLength,
} as const;

const limits = {
	maxSizeBytes: buffer.byteLength * 2,
} as const;

describe("createPhoto", () => {
	test("returns immutable photo value object when within limits", () => {
		const photo = createPhoto(buffer, meta, limits);

		expect(photo.buffer).toBe(buffer);
		expect(photo.mimeType).toBe(meta.mimeType);
		expect(photo.size).toBe(meta.size);
		expect(Object.isFrozen(photo)).toBe(true);
	});

	test("throws PhotoValidationError when mime type is unsupported", () => {
		expect(() =>
			createPhoto(buffer, { ...meta, mimeType: "image/gif" }, limits),
		).toThrowError(PhotoValidationError);
	});

	test("throws PhotoValidationError when size exceeds limit", () => {
		expect(() =>
			createPhoto(
				buffer,
				{
					...meta,
					size: limits.maxSizeBytes + 1,
				},
				limits,
			),
		).toThrowError(PhotoValidationError);
	});
});

describe("validatePhoto", () => {
	test("throws when recorded size mismatches buffer length", () => {
		expect(() =>
			validatePhoto({
				buffer,
				meta: {
					...meta,
					size: buffer.byteLength + 5,
				},
				limits,
			}),
		).toThrowError(PhotoValidationError);
	});
});
