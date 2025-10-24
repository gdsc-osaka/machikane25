import { VisitorSession } from "@/domain/visitorSession";
import { GeneratedImageAsset } from "@/domain/generatedImageAsset";
import { PublicAccessToken } from "@/domain/publicAccessToken";

export type VisitorSessionRepository = Readonly<{
  save: (session: VisitorSession) => Promise<void>;
  findById: (id: string) => Promise<VisitorSession | null>;
  findActiveByAnonymousUid: (
    anonymousUid: string,
  ) => Promise<VisitorSession | null>;
}>;

export type GeneratedImageAssetRepository = Readonly<{
  save: (asset: GeneratedImageAsset) => Promise<void>;
  findBySessionId: (
    sessionId: string,
  ) => Promise<GeneratedImageAsset | null>;
}>;

export type PublicAccessTokenRepository = Readonly<{
  save: (token: PublicAccessToken) => Promise<void>;
  findById: (id: string) => Promise<PublicAccessToken | null>;
}>;
