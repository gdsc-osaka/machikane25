export type StampId = "reception" | "photobooth" | "art" | "robot" | "survey";

type StampDefinition = {
	id: StampId;
	envVar: string;
	labels: Record<"ja" | "en", string>;
};

const stampDefinitions: StampDefinition[] = [
	{
		id: "reception",
		envVar: process.env.STAMP_NFC_TOKEN_RECEPTION ?? "",
		labels: { ja: "受付", en: "Reception" },
	},
	{
		id: "photobooth",
		envVar: process.env.STAMP_NFC_TOKEN_PHOTOBOOTH ?? "",
		labels: { ja: "フォトブース", en: "Photobooth" },
	},
	{
		id: "art",
		envVar: process.env.STAMP_NFC_TOKEN_ART ?? "",
		labels: { ja: "インタラクティブアート", en: "Interactive Art" },
	},
	{
		id: "robot",
		envVar: process.env.STAMP_NFC_TOKEN_ROBOT ?? "",
		labels: { ja: "ロボット展示", en: "Robot Exhibit" },
	},
	{
		id: "survey",
		envVar: process.env.STAMP_NFC_TOKEN_SURVEY ?? "",
		labels: { ja: "アンケート", en: "Survey" },
	},
];

export type ValidatedStamp = {
	stampId: StampId;
	labels: Record<"ja" | "en", string>;
};

export const validateStampToken = (token: string): ValidatedStamp | null => {
	if (!token) {
		return null;
	}

	const match = stampDefinitions.find((definition) => {
		if (!definition.envVar) {
			return false;
		}
		return definition.envVar === token;
	});

	if (!match) {
		return null;
	}

	return {
		stampId: match.id,
		labels: match.labels,
	};
};

export const listStampDefinitions = (): StampDefinition[] => stampDefinitions;
