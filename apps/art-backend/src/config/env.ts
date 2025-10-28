import env from "env-var";

import { AppError } from "../errors/app-error.js";

export type Config = Readonly<{
	apiKey: string;
	firebaseProjectId: string;
	credentialsPath: string;
	fishTtlMinutes: number;
	maxPhotoSizeMb: number;
}>;

type RequiredStringKey =
	| "API_KEY"
	| "FIREBASE_PROJECT_ID"
	| "GOOGLE_APPLICATION_CREDENTIALS";

type RequiredNumberKey = "FISH_TTL_MINUTES" | "MAX_PHOTO_SIZE_MB";

type EnvKey = RequiredStringKey | RequiredNumberKey;

type ConfigErrorContext = Readonly<{
	missingKeys: readonly string[];
	invalidKeys: readonly string[];
}>;

const unique = (values: string[]) => Array.from(new Set(values));

const sanitizeString = (value: string) => value.trim();

export class ConfigError extends AppError {
	readonly context: ConfigErrorContext;

	constructor(context: ConfigErrorContext) {
		super({
			message: "Invalid environment configuration",
			code: "CONFIG_INVALID",
			name: "ConfigError",
			context,
		});
		this.context = context;
	}
}

type IssueRegistration = Readonly<{
	key: EnvKey;
	type: "missing" | "invalid";
}>;

const readString = (
	key: RequiredStringKey,
	registerIssue: (issue: IssueRegistration) => void,
) => {
	try {
		const value = env.get(key).required().asString();
		const sanitized = sanitizeString(value);
		if (sanitized.length === 0) {
			registerIssue({ key, type: "invalid" });
			return null;
		}
		return sanitized;
	} catch {
		registerIssue({ key, type: "missing" });
		return null;
	}
};

const readPositiveMinutes = (
	key: "FISH_TTL_MINUTES",
	registerIssue: (issue: IssueRegistration) => void,
) => {
	try {
		return env.get(key).required().asIntPositive();
	} catch {
		registerIssue({
			key,
			type:
				process.env[key] === undefined ||
				sanitizeString(process.env[key] ?? "").length === 0
					? "missing"
					: "invalid",
		});
		return null;
	}
};

const readPositiveFloat = (
	key: "MAX_PHOTO_SIZE_MB",
	registerIssue: (issue: IssueRegistration) => void,
) => {
	try {
		return env.get(key).required().asFloatPositive();
	} catch {
		registerIssue({
			key,
			type:
				process.env[key] === undefined ||
				sanitizeString(process.env[key] ?? "").length === 0
					? "missing"
					: "invalid",
		});
		return null;
	}
};

export const buildConfig = (): Config => {
	const missing: string[] = [];
	const invalid: string[] = [];

	const registerIssue = (issue: IssueRegistration) => {
		const target = issue.type === "missing" ? missing : invalid;
		target.push(issue.key);
	};

	const apiKey = readString("API_KEY", registerIssue);
	const firebaseProjectId = readString("FIREBASE_PROJECT_ID", registerIssue);
	const credentialsPath = readString(
		"GOOGLE_APPLICATION_CREDENTIALS",
		registerIssue,
	);
	const fishTtlMinutes = readPositiveMinutes("FISH_TTL_MINUTES", registerIssue);
	const maxPhotoSizeMb = readPositiveFloat("MAX_PHOTO_SIZE_MB", registerIssue);

	const missingKeys = unique(missing);
	const invalidKeys = unique(invalid);

	if (
		missingKeys.length > 0 ||
		invalidKeys.length > 0 ||
		apiKey === null ||
		firebaseProjectId === null ||
		credentialsPath === null ||
		fishTtlMinutes === null ||
		maxPhotoSizeMb === null
	) {
		throw new ConfigError({
			missingKeys,
			invalidKeys,
		});
	}

	const config: Config = {
		apiKey,
		firebaseProjectId,
		credentialsPath,
		fishTtlMinutes,
		maxPhotoSizeMb,
	};

	return Object.freeze(config);
};
