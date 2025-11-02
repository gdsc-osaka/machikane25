"use server";

import { z } from "zod";
import {
	completeCapture as completeCaptureService,
	discardSession as discardSessionService,
	startCapture as startCaptureService,
	startGeneration as startGenerationService,
	startSession as startSessionService,
} from "@/application/boothService";

const boothIdSchema = z.object({
	boothId: z.string().min(1, "boothId is required"),
});

const startGenerationSchema = z.object({
	boothId: z.string().min(1, "boothId is required"),
	uploadedPhotoId: z.string().min(1, "uploadedPhotoId is required"),
	options: z.record(z.string(), z.string()),
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
};

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
