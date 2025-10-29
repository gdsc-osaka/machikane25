import { describe, expect, type Mock, test, vi } from "vitest";

import type { Config } from "../../config/env.js";
import { PhotoValidationError } from "../../domain/fish/photo.js";
import { AppError } from "../../errors/app-error.js";
import { UseCaseError } from "../../errors/use-case-error.js";
import { createAddFishFromPhoto } from "../add-fish-from-photo.js";
import type { AddFishDeps } from "../ports.js";

const createBaseConfig = (overrides: Partial<Config> = {}): Config => ({
	apiKey: "test-key",
	firebaseProjectId: "project",
	credentialsPath: "/tmp/creds.json",
	fishTtlMinutes: 30,
	maxPhotoSizeMb: 5,
	...overrides,
});

const createLogger = () =>
	Object.freeze({
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	});

const buildDeps = (
	configOverrides: Partial<Config> = {},
): Readonly<{
	deps: AddFishDeps;
	repoSave: Mock<(a: unknown) => Promise<void>>;
	repoList: Mock<() => Promise<readonly never[]>>;
	storageUpload: Mock<
		(
			a: Readonly<{
				id: string;
				buffer: Buffer;
				mimeType: string;
			}>,
		) => Promise<
			Readonly<{
				imageUrl: string;
				imagePath: string;
			}>
		>
	>;
	imageBlur: Mock<(a: Buffer) => Promise<Buffer>>;
	extractHSV: Mock<
		(a: Buffer) => Promise<readonly { h: number; s: number; v: number }[]>
	>;
}> => {
	const repoSave = vi.fn().mockResolvedValue(undefined);
	const repoList = vi.fn().mockResolvedValue([]);
	const storageUpload = vi.fn().mockResolvedValue({
		imageUrl: "https://storage/fish.png",
		imagePath: "fish_images/generated/fish.png",
	});
	const blurredPhoto = Buffer.from("blurred-photo");
	const imageBlur = vi.fn().mockResolvedValue(blurredPhoto);
	const extractHSV = vi.fn().mockResolvedValue([{ h: 120, s: 0.5, v: 0.7 }]);

	const deps: AddFishDeps = {
		repo: {
			save: repoSave,
			list: repoList,
		},
		storage: {
			upload: storageUpload,
		},
		imageProcessor: {
			blur: imageBlur,
			extractHSV,
		},
		config: createBaseConfig(configOverrides),
		logger: createLogger(),
	};

	return {
		deps,
		repoSave,
		repoList,
		storageUpload,
		imageBlur,
		extractHSV,
	};
};

describe("createAddFishFromPhoto", () => {
	test("orchestrates image processing, storage, and persistence", async () => {
		const photoBuffer = Buffer.from("original-photo");
		const { deps, storageUpload, imageBlur, extractHSV, repoSave } =
			buildDeps();
		const addFish = createAddFishFromPhoto(deps);

		const result = await addFish({
			photo: {
				buffer: photoBuffer,
				mimeType: "image/png",
				size: photoBuffer.byteLength,
			},
			correlationId: "corr-123",
		});

		expect(result).toMatchObject({
			imageUrl: "https://storage/fish.png",
			color: "#59B359",
		});

		expect(imageBlur).toHaveBeenCalledWith(photoBuffer);
		const [firstResult] = imageBlur.mock.results;
		if (firstResult === undefined) {
			throw new Error("blur mock did not record any calls");
		}
		if (!(firstResult.value instanceof Promise)) {
			throw new Error("blur mock did not return a promise");
		}
		const blurred = await firstResult.value;
		expect(extractHSV).toHaveBeenCalledWith(blurred);

		expect(storageUpload).toHaveBeenCalledWith(
			expect.objectContaining({
				buffer: blurred,
				mimeType: "image/png",
			}),
		);

		expect(repoSave).toHaveBeenCalledTimes(1);
		const [savedFish] = repoSave.mock.calls[0] ?? [];
		if (savedFish === undefined) {
			throw new Error("expected fish to be saved");
		}
		expect(savedFish.imageUrl).toBe("https://storage/fish.png");
		expect(savedFish.color).toBe("#59B359");
	});

	test("throws PhotoValidationError when photo exceeds configured limit", async () => {
		const oversize = 512;
		const { deps, imageBlur, storageUpload, repoSave } = buildDeps({
			maxPhotoSizeMb: 0.0001,
		});
		const addFish = createAddFishFromPhoto(deps);
		const photo = {
			buffer: Buffer.alloc(oversize),
			mimeType: "image/png",
			size: oversize,
		};

		await expect(
			addFish({ photo, correlationId: "corr-oversize" }),
		).rejects.toThrow(PhotoValidationError);
		expect(imageBlur).not.toHaveBeenCalled();
		expect(storageUpload).not.toHaveBeenCalled();
		expect(repoSave).not.toHaveBeenCalled();
	});

	test("rethrows AppError instances from dependencies", async () => {
		const appError = new AppError({
			message: "processing failed",
			code: "IMAGE_PROCESSING_FAILED",
		});
		const { deps, storageUpload, repoSave, imageBlur } = buildDeps();
		imageBlur.mockRejectedValue(appError);
		const addFish = createAddFishFromPhoto(deps);
		const photoBuffer = Buffer.from("photo");

		await expect(
			addFish({
				photo: {
					buffer: photoBuffer,
					mimeType: "image/png",
					size: photoBuffer.byteLength,
				},
				correlationId: "corr-app-error",
			}),
		).rejects.toThrow(appError);
		expect(storageUpload).not.toHaveBeenCalled();
		expect(repoSave).not.toHaveBeenCalled();
	});

	test("wraps unexpected errors in UseCaseError", async () => {
		const { deps, storageUpload } = buildDeps();
		storageUpload.mockRejectedValue(new Error("boom"));
		const addFish = createAddFishFromPhoto(deps);
		const photoBuffer = Buffer.from("photo");

		await expect(
			addFish({
				photo: {
					buffer: photoBuffer,
					mimeType: "image/png",
					size: photoBuffer.byteLength,
				},
				correlationId: "corr-unexpected",
			}),
		).rejects.toThrow(UseCaseError);
	});
});
