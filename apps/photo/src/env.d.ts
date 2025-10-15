/// <reference types="next" />
/// <reference types="next/types/global" />

declare namespace NodeJS {
	interface ProcessEnv {
		NEXT_PUBLIC_FIREBASE_CONFIG?: string;
		NEXT_PUBLIC_FIRESTORE_DATABASE_ID: string;
		NEXT_PUBLIC_FIREBASE_EMULATOR_HOST: string;
		NEXT_PUBLIC_FIREBASE_EMULATOR_PORT: string;
	}
}
