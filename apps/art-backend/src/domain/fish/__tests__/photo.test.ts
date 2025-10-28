import { describe, expect, test } from "vitest";
import type { PhotoLimits, PhotoMeta } from "../photo";
import { createPhoto } from "../photo";

const limits: PhotoLimits = { maxSizeBytes: 2 * 1024 * 1024 };
const baseMeta: PhotoMeta = { mimeType: "image/jpeg", size: 512 };

const buildBuffer = () => Buffer.alloc(baseMeta.size, 1);

describe("createPhoto", () => {
	test("returns ok result for a valid photo payload", () => {
		const buffer = buildBuffer();
		const result = createPhoto(buffer, baseMeta, limits);

		expect(result.isOk()).toBe(true);
		const photo = result._unsafeUnwrap();
		expect(photo.buffer).toBe(buffer);
		expect(photo.mimeType).toBe(baseMeta.mimeType);
		expect(photo.size).toBe(baseMeta.size);
	});

	test("rejects photos that exceed configured limit", () => {
		const buffer = Buffer.alloc(limits.maxSizeBytes + 1, 1);
		const meta = { ...baseMeta, size: buffer.byteLength };

		const result = createPhoto(buffer, meta, limits);

		expect(result.isErr()).toBe(true);
		const error = result._unsafeUnwrapErr();
		expect(error.type).toBe("validation");
		expect(error.message).toContain("size");
	});

	test("rejects photos with non-image mime types", () => {
		const buffer = buildBuffer();
		const meta = { ...baseMeta, mimeType: "application/pdf" };

		const result = createPhoto(buffer, meta, limits);

		expect(result.isErr()).toBe(true);
		const error = result._unsafeUnwrapErr();
		expect(error.type).toBe("validation");
		expect(error.message).toContain("mime");
	});

	test("rejects metadata that does not match buffer length", () => {
		const buffer = buildBuffer();
		const meta = { ...baseMeta, size: baseMeta.size + 1 };

		const result = createPhoto(buffer, meta, limits);

		expect(result.isErr()).toBe(true);
		const error = result._unsafeUnwrapErr();
		expect(error.type).toBe("validation");
		expect(error.message).toContain("size mismatch");
	});
});
