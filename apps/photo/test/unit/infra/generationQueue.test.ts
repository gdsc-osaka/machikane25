import { describe, expect, it } from "vitest";
import {
	buildGenerationTaskRequest,
	decodeTaskBody,
} from "@/infra/generationQueue";
import {
	captureOriginalImage,
	createVisitorSession,
	selectTheme,
	startGeneration,
} from "@/domain/visitorSession";

const buildGeneratingSession = () => {
	const createdAt = new Date("2025-10-21T09:00:00.000Z");
	const session = createVisitorSession({
		id: "session-queue",
		anonymousUid: "anon-queue",
		now: createdAt,
	});
	const captured = captureOriginalImage(session, {
		storagePath: "originals/session-queue.jpg",
		capturedAt: new Date("2025-10-21T09:01:00.000Z"),
	});
	const themed = selectTheme(captured, {
		themeId: "theme-fireworks",
		selectedAt: new Date("2025-10-21T09:02:00.000Z"),
	});
	const generating = startGeneration(themed, {
		requestedAt: new Date("2025-10-21T09:03:30.000Z"),
	});
	return generating;
};

describe("Generation queue payload", () => {
	it("constructs Cloud Tasks requests with Gemini payload schema and retry headers", () => {
		const session = buildGeneratingSession();
		const task = buildGenerationTaskRequest({
			session,
			themeId: "theme-fireworks",
			promptSelections: [
				{ type: "location", optionId: "fireworks" },
				{ type: "style", optionId: "dreamy" },
			],
			queueConfig: {
				endpoint: "https://photo.local/api/internal/generate",
				queueName: "gemini-generation",
				geminiModel: "gemini-1.5-flash",
				maxAttempts: 5,
				initialRetryDelaySeconds: 10,
			},
			retryContext: {
				attempt: 1,
				previousDelaySeconds: 0,
			},
			requestedAt: new Date("2025-10-21T09:03:30.000Z"),
		});
		expect(task.httpRequest.httpMethod).toBe("POST");
		expect(task.httpRequest.url).toBe("https://photo.local/api/internal/generate");
		expect(task.httpRequest.headers["Content-Type"]).toBe("application/json");
		expect(task.httpRequest.headers["X-Queue-Name"]).toBe("gemini-generation");
		expect(task.httpRequest.headers["X-Retry-Count"]).toBe("1");
		expect(task.httpRequest.headers["X-Gemini-Model"]).toBe("gemini-1.5-flash");
		const body = decodeTaskBody(task.httpRequest.body);
		expect(body.sessionId).toBe("session-queue");
		expect(body.themeId).toBe("theme-fireworks");
		expect(body.promptSelections).toStrictEqual([
			{ type: "location", optionId: "fireworks" },
			{ type: "style", optionId: "dreamy" },
		]);
		expect(body.requestedAt).toBe("2025-10-21T09:03:30.000Z");
		expect(body.retry.maxAttempts).toBe(5);
		expect(body.retry.nextDelaySeconds).toBeGreaterThan(0);
	});

	it("escalates retry delay exponentially", () => {
		const session = buildGeneratingSession();
		const task = buildGenerationTaskRequest({
			session,
			themeId: "theme-fireworks",
			promptSelections: [{ type: "person", optionId: "pair" }],
			queueConfig: {
				endpoint: "https://photo.local/api/internal/generate",
				queueName: "gemini-generation",
				geminiModel: "gemini-1.5-flash",
				maxAttempts: 5,
				initialRetryDelaySeconds: 5,
			},
			retryContext: {
				attempt: 3,
				previousDelaySeconds: 20,
			},
			requestedAt: new Date("2025-10-21T09:05:00.000Z"),
		});
		const body = decodeTaskBody(task.httpRequest.body);
		expect(body.retry.nextDelaySeconds).toBeGreaterThan(20);
		expect(body.retry.attempt).toBe(3);
	});
});
