"use server";

import { z } from "zod";
import {
	uploadCapturedPhoto as uploadCapturedPhotoService,
	uploadUserPhoto as uploadUserPhotoService,
} from "@/application/photoService";

const uploadSchema = z.object({
	boothId: z.string().min(1, "boothId is required"),
	file: z.instanceof(File, { message: "file must be provided" }),
});

export const uploadUserPhoto = async (input: {
	boothId: string;
	file: File;
}) => {
	const { boothId, file } = uploadSchema.parse(input);
	return uploadUserPhotoService(boothId, file);
};

export const uploadCapturedPhoto = async (input: {
	boothId: string;
	file: File;
}) => {
	const { boothId, file } = uploadSchema.parse(input);
	return uploadCapturedPhotoService(boothId, file);
};
