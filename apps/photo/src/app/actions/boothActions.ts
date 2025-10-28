"use server";

import { z } from "zod";
import {
	completeCapture as completeCaptureService,
	completeGeneration as completeGenerationService,
	startCapture as startCaptureService,
	startGeneration as startGenerationService,
	startSession as startSessionService,
	discardSession as discardSessionService,
} from "@/application/boothService";

const boothIdSchema = z.object({
	boothId: z.string().min(1, "boothId is required"),
});

const startGenerationSchema = z.object({
	boothId: z.string().min(1, "boothId is required"),
	uploadedPhotoId: z.string().min(1, "uploadedPhotoId is required"),
	options: z.record(z.string(), z.string()),
});

const completeGenerationSchema = z.object({
	boothId: z.string().min(1, "boothId is required"),
	generatedPhotoId: z.string().min(1, "generatedPhotoId is required"),
	usedUploadedPhotoId: z.string().min(1, "usedUploadedPhotoId is required"),
});

export const startSession = async (input: { boothId: string }) => {
	console.log("startSession called with input:", input);
	try {
		const { boothId } = boothIdSchema.parse(input);
		console.log(`Starting session for boothId: ${boothId}`);
		await startSessionService(boothId);
	} catch (error) {
		console.error("Error in startSession:", error);
		throw error;
	}
};

export const discardSession = async (input: { boothId: string }) => {
	const { boothId } = boothIdSchema.parse(input);
	console.log(`Discarding session for boothId: ${boothId}`);
	await discardSessionService(boothId);
}

export const startCapture = async (input: { boothId: string }) => {
	const { boothId } = boothIdSchema.parse(input);
	await startCaptureService(boothId);
};

export const completeCapture = async (input: { boothId: string }) => {
	const { boothId } = boothIdSchema.parse(input);
	await completeCaptureService(boothId);
};

export const startGeneration = async (input: {
	boothId: string;
	uploadedPhotoId: string;
	options: Record<string, string>;
}) => {
	const { boothId, uploadedPhotoId, options } =
		startGenerationSchema.parse(input);
	await startGenerationService(boothId, uploadedPhotoId, options);
};

export const completeGeneration = async (input: {
	boothId: string;
	generatedPhotoId: string;
	usedUploadedPhotoId: string;
}) => {
	const { boothId, generatedPhotoId, usedUploadedPhotoId } =
		completeGenerationSchema.parse(input);
	await completeGenerationService(
		boothId,
		generatedPhotoId,
		usedUploadedPhotoId,
	);
};
