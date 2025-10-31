"use server";

import { errAsync, okAsync, ResultAsync } from "neverthrow";
import { getSurveyFormConfig } from "@/infra/remote-config/survey";

/**
 * Googleフォームにデータを送信するサーバーアクション。
 * サーバー環境変数からフォームのURLを読み取ります。
 * @param formData 送信するデータ
 * @returns 成功したか、失敗したかを示すシリアライズ可能なオブジェクト
 */
export const submitGoogleFormAction = async (
	formResponseUrl: string,
	formData: FormData,
): Promise<
	| { success: true }
	| { success: false; error: { message: string; status?: number } }
> => {
	const result = await ResultAsync.fromPromise(
		fetch(formResponseUrl, {
			method: "POST",
			body: formData,
		}),
		(cause) => ({
			message: "Network request to Google Forms failed.",
			cause,
		}),
	).andThen((response) =>
		response.ok
			? okAsync(undefined)
			: errAsync({
					message: "Submission to Google Forms was not successful.",
					status: response.status,
				}),
	);

	if (result.isOk()) {
		return { success: true };
	}

	return { success: false, error: result.error };
};
