import { ResultAsync } from "neverthrow";
import { match } from "ts-pattern";
import {
  CloudFunctionError,
  UploadAudioError,
} from "../infra/cloud-function-repo.error";
import { GenerateProfile } from "../service/profiles-service";
import { HTTPErrorCarrier, StatusCode } from "./error/api-error";
import { convertErrorToApiError } from "./error/api-error-utils";
import { UploadAudioResponse } from "../infra/cloud-function-repo";

export const generateProfileController = (
  generateProfileRes: ReturnType<GenerateProfile>
): ResultAsync<UploadAudioResponse, HTTPErrorCarrier> =>
  generateProfileRes.mapErr((err) =>
    HTTPErrorCarrier(
      match(err)
        .with(CloudFunctionError.is, () => StatusCode.InternalServerError)
        .with(UploadAudioError.is, () => StatusCode.InternalServerError)
        .exhaustive(),
      convertErrorToApiError(err)
    )
  );
