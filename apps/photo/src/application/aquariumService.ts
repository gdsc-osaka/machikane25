type SentryTag = {
	key?: string;
	name?: string;
	value?: string;
};

type RawSentryIssue = {
	id?: string;
	eventID?: string;
	title?: string;
	permalink?: string;
	lastSeen?: string;
	metadata?: Record<string, unknown>;
	latestEvent?: {
		id?: string;
		eventID?: string;
		dateCreated?: string;
		tags?: SentryTag[];
	};
	tags?: SentryTag[];
};

export type AquariumSyncError = {
	eventId: string;
	photoId: string;
	errorMessage: string;
	timestamp: string;
	issueUrl: string;
};

type SentryEnv = {
	endpoint: string;
	token: string;
};

const ensureSentryEnv = (): SentryEnv => {
	const endpoint = process.env.SENTRY_AQUARIUM_ENDPOINT ?? "";
	const token = process.env.SENTRY_API_TOKEN ?? "";

	if (!endpoint || !token) {
		throw new Error("Sentry Aquarium endpoint or token is not configured");
	}

	return { endpoint, token };
};

const extractTags = (issue: RawSentryIssue): SentryTag[] => {
	const issueTags = Array.isArray(issue.tags) ? issue.tags : [];
	const latestEventTags = Array.isArray(issue.latestEvent?.tags)
		? (issue.latestEvent?.tags ?? [])
		: [];

	return [...issueTags, ...latestEventTags];
};

const findTagValue = (tags: SentryTag[], tagName: string): string | null => {
	const tag = tags.find((entry) => {
		const key = entry?.key ?? entry?.name ?? "";
		return key.toLowerCase() === tagName.toLowerCase();
	});

	return tag?.value ?? null;
};

const toIsoString = (value: string | undefined): string => {
	if (!value) {
		return new Date(0).toISOString();
	}
	const date = new Date(value);
	return Number.isNaN(date.getTime())
		? new Date(0).toISOString()
		: date.toISOString();
};

const toErrorMessage = (issue: RawSentryIssue): string => {
	const metadata = issue.metadata ?? {};
	const metadataMessage = Reflect.get(metadata, "value");
	if (typeof metadataMessage === "string" && metadataMessage) {
		return metadataMessage;
	}

	const metadataType = Reflect.get(metadata, "type");
	if (typeof metadataType === "string" && metadataType) {
		return metadataType;
	}

	return issue.title ?? "Aquarium sync failed";
};

export const mapSentryIssueToSyncError = (
	issue: RawSentryIssue,
): AquariumSyncError | null => {
	const tags = extractTags(issue);
	const photoId = findTagValue(tags, "photoId");

	if (!photoId) {
		return null;
	}

	const issueUrl = issue.permalink ?? "";
	const eventId =
		issue.eventID ??
		issue.id ??
		issue.latestEvent?.eventID ??
		issue.latestEvent?.id ??
		photoId;

	return {
		eventId,
		photoId,
		errorMessage: toErrorMessage(issue),
		timestamp: toIsoString(
			issue.latestEvent?.dateCreated ?? issue.lastSeen ?? undefined,
		),
		issueUrl,
	};
};

const parseSentryIssues = (payload: unknown): RawSentryIssue[] => {
	if (!Array.isArray(payload)) {
		return [];
	}

	return payload.filter(
		(entry): entry is RawSentryIssue =>
			typeof entry === "object" && entry !== null,
	);
};

export const getSyncErrors = async (): Promise<AquariumSyncError[]> => {
	const { endpoint, token } = ensureSentryEnv();

	const response = await fetch(endpoint, {
		method: "GET",
		headers: {
			Authorization: `Bearer ${token}`,
			Accept: "application/json",
		},
	});

	if (!response.ok) {
		throw new Error(`Failed to fetch aquarium sync errors: ${response.status}`);
	}

	const payload = await response.json();
	const issues = parseSentryIssues(payload);
	const mapped = issues.map(mapSentryIssueToSyncError);
	return mapped.filter((issue): issue is AquariumSyncError => issue !== null);
};
