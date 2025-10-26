import type { PhotoCopy } from "./photo.en";

export const photoCopyJa: PhotoCopy = {
	kiosk: {
		title: "AIフォトブース",
		description:
			"撮影からテーマ選択・生成までの体験を数十秒で完結。Geminiが祭の思い出を彩ります。",
		actions: {
			back: "戻る",
			next: "次へ",
		},
		statuses: {
			capturing: "撮影中",
			"selecting-theme": "テーマ選択中",
			generating: "生成中",
			completed: "完了",
			failed: "失敗",
			expired: "期限切れ",
		},
	},
};
