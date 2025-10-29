import { errorBuilder, InferError } from "../shared/error";

export const CustomerAlreadyExistsError = errorBuilder(
  "CustomerAlreadyExistsError"
);
export type CustomerAlreadyExistsError = InferError<
  typeof CustomerAlreadyExistsError
>;

export const CustomerNotFoundError = errorBuilder("CustomerNotFoundError");
export type CustomerNotFoundError = InferError<typeof CustomerNotFoundError>;

export const CustomerTosAlreadyAcceptedError = errorBuilder(
  "CustomerTosAlreadyAcceptedError"
);
export type CustomerTosAlreadyAcceptedError = InferError<
  typeof CustomerTosAlreadyAcceptedError
>;
