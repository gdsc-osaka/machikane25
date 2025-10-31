import { findGeneratedPhotoByPhotoId } from "@/infra/firebase/photoRepository";
import { sendToAquarium } from "./generationService";

type RetryInput = {
	eventId: string;
	photoId: string;
	issueUrl: string;
};

type RetryResult = {
	eventId: string;
	photoId: string;
	status: "success";
	retriedAt: string;
	issueUrl: string;
};

const createRetryError = (message: string): Error => {
	const error = new Error(message);
	error.name = "AquariumRetryError";
	return error;
};

export const retryAquariumSync = async (
	input: RetryInput,
): Promise<RetryResult> => {
	const generatedPhoto = await findGeneratedPhotoByPhotoId(input.photoId);

	if (!generatedPhoto) {
		throw createRetryError(
			`Generated photo not found for photoId: ${input.photoId}`,
		);
	}

	await sendToAquarium(generatedPhoto);

	return {
		eventId: input.eventId,
		photoId: input.photoId,
		status: "success",
		retriedAt: new Date().toISOString(),
		issueUrl: input.issueUrl,
	};
};
