import { beforeEach, describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";

const boothServiceMocks = vi.hoisted(() => ({
	startSession: vi.fn(),
	startCapture: vi.fn(),
	completeCapture: vi.fn(),
	startGeneration: vi.fn(),
	completeGeneration: vi.fn(),
}));

vi.mock("@/application/boothService", () => boothServiceMocks);

const mockStartSession = boothServiceMocks.startSession;
const mockStartCapture = boothServiceMocks.startCapture;
const mockCompleteCapture = boothServiceMocks.completeCapture;
const mockStartGeneration = boothServiceMocks.startGeneration;
const mockCompleteGeneration = boothServiceMocks.completeGeneration;

describe("boothActions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("startSession validates input and delegates to service", async () => {
		const { startSession } = await import("@/app/actions/boothActions");
		await startSession({ boothId: "booth-1" });

		expect(mockStartSession).toHaveBeenCalledWith("booth-1");
	});

	it("startSession rejects empty boothId", async () => {
		const { startSession } = await import("@/app/actions/boothActions");

		await expect(startSession({ boothId: "" })).rejects.toBeInstanceOf(
			ZodError,
		);
		expect(mockStartSession).not.toHaveBeenCalled();
	});

	it("startCapture validates boothId and delegates", async () => {
		const { startCapture } = await import("@/app/actions/boothActions");
		await startCapture({ boothId: "booth-2" });

		expect(mockStartCapture).toHaveBeenCalledWith("booth-2");
	});

	it("completeCapture validates boothId and delegates", async () => {
		const { completeCapture } = await import("@/app/actions/boothActions");
		await completeCapture({ boothId: "booth-3" });

		expect(mockCompleteCapture).toHaveBeenCalledWith("booth-3");
	});

	it("startGeneration validates payload and delegates", async () => {
		const { startGeneration } = await import("@/app/actions/boothActions");
		await startGeneration({
			boothId: "booth-4",
			uploadedPhotoId: "photo-123",
			options: { style: "style-1" },
		});

		expect(mockStartGeneration).toHaveBeenCalledWith("booth-4", "photo-123", {
			style: "style-1",
		});
	});

	it("startGeneration rejects invalid payload", async () => {
		const { startGeneration } = await import("@/app/actions/boothActions");

		await expect(
			// @ts-expect-error intentional invalid payload for validation test
			startGeneration({ boothId: "", uploadedPhotoId: "", options: null }),
		).rejects.toBeInstanceOf(ZodError);
		expect(mockStartGeneration).not.toHaveBeenCalled();
	});

	it("completeGeneration validates payload and delegates", async () => {
		const { completeGeneration } = await import("@/app/actions/boothActions");
		await completeGeneration({
			boothId: "booth-5",
			generatedPhotoId: "generated-1",
			usedUploadedPhotoId: "uploaded-2",
		});

		expect(mockCompleteGeneration).toHaveBeenCalledWith(
			"booth-5",
			"generated-1",
			"uploaded-2",
		);
	});

	it("completeGeneration rejects invalid payload", async () => {
		const { completeGeneration } = await import("@/app/actions/boothActions");

		await expect(
			completeGeneration({
				boothId: "",
				generatedPhotoId: "",
				usedUploadedPhotoId: "",
			}),
		).rejects.toBeInstanceOf(ZodError);
		expect(mockCompleteGeneration).not.toHaveBeenCalled();
	});
});
