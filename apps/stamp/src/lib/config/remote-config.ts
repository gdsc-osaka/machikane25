/* v8 ignore start */
import { fetchAndActivate, getNumber, getString } from "firebase/remote-config";
import { getFirebaseRemoteConfig } from "../firebase/client";

export type MaintenanceStatus = "online" | "degraded" | "maintenance";

export type MaintenanceConfig = {
	status: MaintenanceStatus;
	messageJa: string;
	messageEn: string;
	whitelist: string[];
	rewardExpiryMinutes: number;
	fetchedAt: number;
};

const TTL_MS =
	Number.parseInt(
		process.env.NEXT_PUBLIC_REMOTE_CONFIG_CACHE_SECONDS ?? "60",
		10,
	) * 1000;

let cachedConfig: MaintenanceConfig | null = null;

const parseStatus = (value: string): MaintenanceStatus => {
	if (value === "maintenance" || value === "degraded") {
		return value;
	}
	return "online";
};

export const getMaintenanceConfig = async (
	options: { forceRefresh?: boolean } = {},
): Promise<MaintenanceConfig> => {
	if (
		!options.forceRefresh &&
		cachedConfig &&
		Date.now() - cachedConfig.fetchedAt < TTL_MS
	) {
		return cachedConfig;
	}

	const remoteConfig = getFirebaseRemoteConfig();
	await fetchAndActivate(remoteConfig);

	const status = parseStatus(getString(remoteConfig, "stamp_app_status"));
	const whitelistValue = getString(remoteConfig, "maintenance_whitelist");

	let whitelist: string[] = [];
	try {
		const parsed = JSON.parse(whitelistValue);
		if (Array.isArray(parsed)) {
			whitelist = parsed.filter(
				(value): value is string => typeof value === "string",
			);
		}
	} catch {
		whitelist = [];
	}

	const result: MaintenanceConfig = {
		status,
		messageJa: getString(remoteConfig, "stamp_app_message_ja"),
		messageEn: getString(remoteConfig, "stamp_app_message_en"),
		whitelist,
		rewardExpiryMinutes: getNumber(remoteConfig, "reward_expiry_minutes"),
		fetchedAt: Date.now(),
	};

	cachedConfig = result;
	return result;
};
