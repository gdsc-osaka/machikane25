import env from "env-var";

export type Config = Readonly<{
	apiKey: string;
	firebaseProjectId: string;
	credentialsPath: string;
	fishTtlMinutes: number;
	maxPhotoSizeMb: number;
}>;

const readString = (key: string) => env.get(key).required().asString();
const readPositiveInt = (key: string) =>
	env.get(key).required().asIntPositive();

export const buildConfig = (): Config => {
	const config = {
		apiKey: readString("API_KEY"),
		firebaseProjectId: readString("FIREBASE_PROJECT_ID"),
		credentialsPath: readString("GOOGLE_APPLICATION_CREDENTIALS"),
		fishTtlMinutes: readPositiveInt("FISH_TTL_MINUTES"),
		maxPhotoSizeMb: readPositiveInt("MAX_PHOTO_SIZE_MB"),
	} satisfies Config;

	return Object.freeze(config);
};
