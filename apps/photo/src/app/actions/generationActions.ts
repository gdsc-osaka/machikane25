"use server";

import {
	getGeneratedPhoto,
	isPhotoExpiredError,
	isPhotoNotFoundError,
} from "@/application/generationService";

type GeneratedPhotoData = {
	imageUrl: string;
};

type GeneratedPhotoActionError = "EXPIRED" | "NOT_FOUND";

export type GeneratedPhotoActionResult =
	| {
			data: GeneratedPhotoData;
			error: null;
	  }
	| {
			data: null;
			error: GeneratedPhotoActionError;
	  };

export const getGeneratedPhotoAction = async (
	boothId: string,
	photoId: string,
): Promise<GeneratedPhotoActionResult> => {
	try {
		const photo = await getGeneratedPhoto(boothId, photoId);
		return {
			data: {
				imageUrl: photo.imageUrl,
			},
			error: null,
		};
	} catch (error) {
		if (isPhotoExpiredError(error)) {
			return {
				data: null,
				error: "EXPIRED",
			};
		}
		if (isPhotoNotFoundError(error)) {
			return {
				data: null,
				error: "NOT_FOUND",
			};
		}
		throw error;
	}
};
