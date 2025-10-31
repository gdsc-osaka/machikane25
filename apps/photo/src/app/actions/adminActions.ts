"use server";

import { z } from "zod";
import { retryAquariumSync } from "@/application/adminService";
import { getSyncErrors } from "@/application/aquariumService";

const retrySchema = z.object({
	eventId: z.string().min(1, "eventId is required"),
	photoId: z.string().min(1, "photoId is required"),
	issueUrl: z.string().url("issueUrl must be a valid URL"),
});

export const retryAquariumSyncAction = async (input: {
	eventId: string;
	photoId: string;
	issueUrl: string;
}) => {
	const parsed = retrySchema.parse(input);
	return retryAquariumSync(parsed);
};

export const getAquariumSyncErrorsAction = async () => getSyncErrors();
