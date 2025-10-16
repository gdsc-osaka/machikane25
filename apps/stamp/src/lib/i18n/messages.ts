export type SupportedLocale = "ja" | "en";

type MessageMap = Record<SupportedLocale, string>;

const messageCatalog = {
  progressHeading: {
    ja: "スタンプの進捗",
    en: "Stamp Progress",
  },
  collectAllCta: {
    ja: "全てのスタンプを集めましょう！",
    en: "Collect every stamp to finish the rally!",
  },
  surveyCta: {
    ja: "アンケートに回答する",
    en: "Take the survey",
  },
  rewardCta: {
    ja: "景品を受け取る",
    en: "Claim your reward",
  },
  duplicateStamp: {
    ja: "このスタンプはすでに獲得済みです",
    en: "This stamp has already been collected.",
  },
  invalidStamp: {
    ja: "無効なスタンプです。スタッフにお声がけください。",
    en: "This stamp link is invalid. Please ask a staff member.",
  },
  maintenanceBanner: {
    ja: "現在メンテナンス中です。しばらくお待ちください。",
    en: "The stamp rally is under maintenance. Please stand by.",
  },
  rewardIssued: {
    ja: "景品のQRコードを表示中です。スタッフにお見せください。",
    en: "Showing your reward QR code. Present it to a staff member.",
  },
  rewardRedeemed: {
    ja: "景品は受け取り済みです。ご参加ありがとうございました！",
    en: "Reward already redeemed. Thank you for participating!",
  },
  adminScanPrompt: {
    ja: "QRコードをスキャンして景品の受け渡しを記録してください。",
    en: "Scan the QR code to record reward fulfillment.",
  },
  adminManualPrompt: {
    ja: "スキャンできない場合は手入力でユーザーIDを検索してください。",
    en: "If scanning fails, search for the attendee ID manually.",
  },
  surveyThanks: {
    ja: "アンケートのご協力ありがとうございました！",
    en: "Thanks for completing the survey!",
  },
  surveyRetry: {
    ja: "アンケートの送信に失敗しました。通信状況を確認して再度お試しください。",
    en: "Survey submission failed. Check your connection and try again.",
  },
} satisfies Record<string, MessageMap>;

export type MessageKey = keyof typeof messageCatalog;

export const translate = (
  key: MessageKey,
  locale: SupportedLocale = "ja",
): string => {
  const entry = messageCatalog[key];
  if (!entry) {
    return key;
  }
  if (locale in entry) {
    return entry[locale];
  }
  return entry.ja;
};

export const messages = messageCatalog;
