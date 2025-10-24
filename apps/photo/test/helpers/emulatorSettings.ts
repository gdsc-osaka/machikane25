import { readFileSync } from "node:fs";
import { join } from "node:path";

type EmulatorSettings = Readonly<{
	host: string;
	firestorePort: number;
	storagePort: number;
}>;

const defaultSettings: EmulatorSettings = {
	host: "127.0.0.1",
	firestorePort: 11002,
	storagePort: 11004,
};

const parseHostAndPort = (value?: string | null) => {
	if (!value) {
		return null;
	}
	const [rawHost, rawPort] = value.split(":");
	const host = rawHost?.trim();
	const port = Number.parseInt(rawPort ?? "", 10);
	return {
		host: host?.length ? host : undefined,
		port: Number.isFinite(port) ? port : undefined,
	};
};

const parsePort = (value?: string | null) => {
	if (!value) {
		return undefined;
	}
	const parsed = Number.parseInt(value, 10);
	return Number.isFinite(parsed) ? parsed : undefined;
};

const parseJsonPorts = () => {
	const raw = process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_PORTS;
	if (!raw) {
		return {};
	}
	try {
		const parsed = JSON.parse(raw);
		return typeof parsed === "object" && parsed !== null
			? {
					auth: parsePort(Reflect.get(parsed, "auth")),
					firestore: parsePort(Reflect.get(parsed, "firestore")),
					storage: parsePort(Reflect.get(parsed, "storage")),
					functions: parsePort(Reflect.get(parsed, "functions")),
				}
			: {};
	} catch {
		return {};
	}
};

const readFirebaseJsonSettings = (): Partial<EmulatorSettings> => {
	try {
		const configPath = join(__dirname, "../../../../firebase.json");
		const configRaw = readFileSync(configPath, "utf8");
		const parsed = JSON.parse(configRaw);
		const emulators = parsed?.emulators;
		if (!emulators || typeof emulators !== "object") {
			return {};
		}
		const firestore = Reflect.get(emulators, "firestore");
		const storage = Reflect.get(emulators, "storage");
		const firestorePort = firestore?.port;
		const storagePort = storage?.port;
		const host = firestore?.host ?? storage?.host;
		return {
			host: typeof host === "string" ? host : undefined,
			firestorePort:
				typeof firestorePort === "number" ? firestorePort : undefined,
			storagePort:
				typeof storagePort === "number" ? storagePort : undefined,
		};
	} catch {
		return {};
	}
};

export const resolveEmulatorSettings = (): EmulatorSettings => {
	const firebaseJsonSettings = readFirebaseJsonSettings();
	const portsFromJson = parseJsonPorts();

	const firestoreHostPort = parseHostAndPort(
		process.env.FIRESTORE_EMULATOR_HOST,
	);
	const storageHostPort = parseHostAndPort(
		process.env.STORAGE_EMULATOR_HOST ??
			process.env.FIREBASE_STORAGE_EMULATOR_HOST,
	);

	const host =
		firestoreHostPort?.host ??
		storageHostPort?.host ??
		parseHostAndPort(process.env.FIREBASE_EMULATOR_HOST)?.host ??
		firebaseJsonSettings.host ??
		defaultSettings.host;

	const firestorePort =
		firestoreHostPort?.port ??
		parsePort(process.env.FIRESTORE_EMULATOR_PORT) ??
		portsFromJson.firestore ??
		firebaseJsonSettings.firestorePort ??
		defaultSettings.firestorePort;

	const storagePort =
		storageHostPort?.port ??
		parsePort(
			process.env.STORAGE_EMULATOR_PORT ??
				process.env.FIREBASE_STORAGE_EMULATOR_PORT,
		) ??
		portsFromJson.storage ??
		firebaseJsonSettings.storagePort ??
		defaultSettings.storagePort;

	return {
		host,
		firestorePort,
		storagePort,
	};
};
