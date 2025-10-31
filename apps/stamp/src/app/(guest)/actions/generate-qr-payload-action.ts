"use server";

import type { RewardQrEncodingError } from "@/domain/reward";
import { createRewardQrPayloadGenerator } from "@/domain/reward";

const generate = createRewardQrPayloadGenerator();

export const generateQrPayloadAction = async ({
	attendeeId,
	issuedAt,
}: {
	attendeeId: string;
	issuedAt: number;
}): Promise<
	| { success: true; qrPayload: string }
	| { success: false; error: RewardQrEncodingError }
> => {
	const result = await generate(attendeeId, issuedAt);

	if (result.isOk()) {
		return { success: true, qrPayload: result.value };
	}

	return { success: false, error: result.error };
};
