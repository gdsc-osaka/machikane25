import { PhotoValidationError } from "../domain/fish/photo.js";
import type { AppError } from "./app-error.js";
import {ContentfulStatusCode} from "hono/utils/http-status";

export type LogSeverity = "info" | "warn" | "error";

export type HttpErrorMetadata = Readonly<{
	status: ContentfulStatusCode;
	severity: LogSeverity;
}>;

const defaultMetadata: HttpErrorMetadata = Object.freeze({
	status: 500,
	severity: "error",
});

const byName = (name: string) => (error: AppError) => error.name === name;

const mappings: ReadonlyArray<
	Readonly<{
		match: (error: AppError) => boolean;
		metadata: HttpErrorMetadata;
	}>
> = [
	{
		match: byName("AuthenticationError"),
		metadata: Object.freeze({ status: 401, severity: "warn" }),
	},
	{
		match: byName("RequestValidationError"),
		metadata: Object.freeze({ status: 400, severity: "warn" }),
	},
	{
		match: (error) => error instanceof PhotoValidationError,
		metadata: Object.freeze({ status: 400, severity: "warn" }),
	},
	{
		match: byName("RepositoryError"),
		metadata: Object.freeze({ status: 500, severity: "error" }),
	},
	{
		match: byName("StorageError"),
		metadata: Object.freeze({ status: 500, severity: "error" }),
	},
	{
		match: byName("ImageProcessingError"),
		metadata: Object.freeze({ status: 500, severity: "error" }),
	},
	{
		match: byName("UseCaseError"),
		metadata: Object.freeze({ status: 500, severity: "error" }),
	},
];

export const mapErrorToHttp = (error: AppError): HttpErrorMetadata => {
	const match = mappings.find((candidate) => candidate.match(error));
	return match?.metadata ?? defaultMetadata;
};
