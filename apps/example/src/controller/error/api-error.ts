import { z } from "@hono/zod-openapi";

export const ApiErrorCode = z
  .enum([
    "internal/database_error",
    "internal/firestore_error",
    "authorization/invalid_session",
    "authorization/invalid_api_key",
    "store/not_found",
    "store/already_exists",
    "store/invalid_store_id",
    "store/invalid",
    "store/wrong_store_id",
    "customer/already_exists",
    "customer/not_found",
    "customer/invalid",
    "customer/not_belongs_to_store",
    "customer/tos_already_accepted",
    "customer/face_auth_error",
    "customer_session/already_exists",
    "face_embedding/error",
    "staff/not_found",
    "staff/invalid",
    "staff/invalid_role",
    "staff/already_exists_in_store",
    "staff/is_not_admin",
    "staff_invitation/not_found",
    "staff_invitation/already_exists",
    "staff_invitation/duplicate",
    "staff_invitation/permission_error",
    "staff_invitation/expired",
    "staff_invitation/not_pending",
    "staff_invitation/wrong_email",
    "staff_invitation/invalid",
    "visit/not_found",
    "store_api_key/already_exists",
    "store_api_key/not_found",
    "profile/invalid",
    "cloud_function/error",
    "cloud_function/upload_audio_error",
  ])
  .openapi("ApiErrorCode");
export type ApiErrorCode = z.infer<typeof ApiErrorCode>;

export const ApiError = z
  .object({
    message: z.string(),
    code: ApiErrorCode,
    details: z.array(z.unknown()).default([]),
  })
  .openapi("ApiError");
export interface ApiError<Code extends ApiErrorCode = ApiErrorCode> {
  message: string;
  code: Code;
  details?: unknown[];
}

export enum StatusCode {
  BadRequest = 400,
  Unauthorized = 401,
  Forbidden = 403,
  NotFound = 404,
  Conflict = 409,
  TooManyRequests = 429,
  InternalServerError = 500,
  NotImplemented = 501,
  ServiceUnavailable = 503,
}

// type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export const HTTPErrorCarrier = <Code extends ApiErrorCode>(
  status: StatusCode,
  error: ApiError<Code>
) => ({
  status,
  error: error,
});
export type HTTPErrorCarrier = ReturnType<typeof HTTPErrorCarrier>;
