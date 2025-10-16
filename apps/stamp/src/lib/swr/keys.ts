const swrKeys = {
  maintenance: () => ["stamp", "maintenance"] as const,
  progress: (uid?: string | null) =>
    ["stamp", "progress", uid ?? "anonymous"] as const,
  stampAward: (token: string) => ["stamp", "award", token] as const,
  surveyStatus: (uid?: string | null) =>
    ["stamp", "survey", uid ?? "anonymous"] as const,
  rewardPreview: (uid: string) => ["stamp", "reward", uid] as const,
  adminRedemption: (payloadHash: string) =>
    ["stamp", "redeem", payloadHash] as const,
};

export type SwrKey =
  | ReturnType<typeof swrKeys.maintenance>
  | ReturnType<typeof swrKeys.progress>
  | ReturnType<typeof swrKeys.stampAward>
  | ReturnType<typeof swrKeys.surveyStatus>
  | ReturnType<typeof swrKeys.rewardPreview>
  | ReturnType<typeof swrKeys.adminRedemption>;

export { swrKeys };
