import { errAsync, okAsync, ResultAsync } from "neverthrow";
import {
  CloudFunctionError,
  UploadAudioError,
} from "./cloud-function-repo.error";
import { infraLogger } from "../logger";
import { iife } from "../shared/func";
import env from "../env";

export type CloudFunctionProfileData = {
  gender: string;
  birthday: string;
  birthplace: string;
  business: string;
  partner: string;
  hobby: string;
  news: string;
  worry: string;
  store: string;
};

export type CallCloudFunction = (
  functionName: string,
  file: File,
  customerId: string
) => ResultAsync<UploadAudioResponse, CloudFunctionError | UploadAudioError>;

export interface UploadAudioResponse {
  message: string;
  taskId: string;
}

interface ErrorResponse {
  message: string;
  code: string;
  details: unknown[];
}

const url =
  env.NODE_ENV === "production"
    ? "https://asia-northeast1-recall-you.cloudfunctions.net/"
    : "http://127.0.0.1:5001/recall-you/asia-northeast1/";

export const callCloudFunction: CallCloudFunction = (
  functionName,
  file,
  customerId
) =>
  ResultAsync.fromPromise(
    fetch(new URL(functionName, url), {
      method: "POST",
      body: iife(() => {
        const formData = new FormData();
        formData.append("recording", file);
        formData.append("customerId", customerId);
        return formData;
      }),
    }).then(async (res) => ({
      status: res.status,
      json: (await res.json()) as unknown,
    })),
    CloudFunctionError.handle
  )
    .andThen((res) =>
      res.status === 200
        ? okAsync(res.json as UploadAudioResponse)
        : errAsync(
            iife(() => {
              const json = res.json as ErrorResponse;
              return UploadAudioError(json.message, {
                extra: {
                  code: json.code,
                  details: json.details,
                },
              });
            })
          )
    )
    .orTee(infraLogger("callCloudFunction").error);
