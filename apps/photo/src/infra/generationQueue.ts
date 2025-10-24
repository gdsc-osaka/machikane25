import { VisitorSession } from "@/domain/visitorSession";
import { GenerationOptionType } from "@/infra/remoteConfig";

export type PromptSelection = Readonly<{
  type: GenerationOptionType;
  optionId: string;
}>;

export type GenerationQueueConfig = Readonly<{
  endpoint: string;
  queueName: string;
  geminiModel: string;
  maxAttempts: number;
  initialRetryDelaySeconds: number;
}>;

export type RetryContext = Readonly<{
  attempt: number;
  previousDelaySeconds: number;
}>;

export type GenerationTaskPayload = Readonly<{
  sessionId: string;
  themeId: string;
  promptSelections: ReadonlyArray<PromptSelection>;
  requestedAt: string;
  retry: Readonly<{
    attempt: number;
    maxAttempts: number;
    nextDelaySeconds: number;
  }>;
}>;

export type CloudTaskRequest = Readonly<{
  httpRequest: Readonly<{
    httpMethod: "POST";
    url: string;
    headers: Record<string, string>;
    body: string;
  }>;
}>;

const computeNextDelay = (
  config: GenerationQueueConfig,
  context: RetryContext,
) => {
  const base = config.initialRetryDelaySeconds;
  const exponential = base * Math.max(1, context.attempt);
  const doubled = context.previousDelaySeconds > 0
    ? context.previousDelaySeconds * 2
    : base;
  return Math.max(exponential, doubled);
};

export const buildGenerationTaskRequest = (input: {
  session: VisitorSession;
  themeId: string;
  promptSelections: ReadonlyArray<PromptSelection>;
  queueConfig: GenerationQueueConfig;
  retryContext: RetryContext;
  requestedAt: Date;
}): CloudTaskRequest => {
  const payload: GenerationTaskPayload = {
    sessionId: input.session.id,
    themeId: input.themeId,
    promptSelections: input.promptSelections,
    requestedAt: input.requestedAt.toISOString(),
    retry: {
      attempt: input.retryContext.attempt,
      maxAttempts: input.queueConfig.maxAttempts,
      nextDelaySeconds: computeNextDelay(
        input.queueConfig,
        input.retryContext,
      ),
    },
  };
  const encodedBody = Buffer.from(
    JSON.stringify(payload),
    "utf8",
  ).toString("base64");
  return {
    httpRequest: {
      httpMethod: "POST",
      url: input.queueConfig.endpoint,
      headers: {
        "Content-Type": "application/json",
        "X-Queue-Name": input.queueConfig.queueName,
        "X-Retry-Count": String(input.retryContext.attempt),
        "X-Gemini-Model": input.queueConfig.geminiModel,
      },
      body: encodedBody,
    },
  };
};

export const decodeTaskBody = (body: string): GenerationTaskPayload =>
  JSON.parse(Buffer.from(body, "base64").toString("utf8"));
