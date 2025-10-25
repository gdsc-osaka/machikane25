import { NextRequest, NextResponse } from "next/server";
import { getFirebaseClients } from "@/firebase";
import { createVisitorSessionRepository } from "@/infra/firestore/visitorSessionRepository";
import { requestGeneration } from "@/application/visitorSession/requestGeneration";
import type { PromptSelection } from "@/infra/generationQueue";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    sessionId: string;
  }>;
};

type GenerateRequestBody = {
  themeId: string;
  promptSelections: ReadonlyArray<PromptSelection>;
};

const RETRY_AFTER_SECONDS = 5;

// Mock enqueue function for now - will be replaced with actual Cloud Tasks implementation
const mockEnqueueGenerationTask = async (
  // biome-ignore lint/suspicious/noExplicitAny: task request type is complex
  taskRequest: any,
): Promise<void> => {
  console.log("Mock enqueue generation task:", taskRequest);
  // In production, this would call Cloud Tasks API
};

export async function POST(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    // Await params
    const { sessionId } = await context.params;

    // Get Firebase clients
    const { auth, firestore } = await getFirebaseClients();

    // Check authentication
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return NextResponse.json(
        { error: "Unauthorized - authentication required" },
        { status: 401 },
      );
    }

    // Parse request body
    let body: GenerateRequestBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    if (!body.themeId || typeof body.themeId !== "string") {
      return NextResponse.json(
        { error: "themeId is required and must be a string" },
        { status: 400 },
      );
    }

    if (!Array.isArray(body.promptSelections)) {
      return NextResponse.json(
        { error: "promptSelections is required and must be an array" },
        { status: 400 },
      );
    }

    // Create repository
    const repository = createVisitorSessionRepository(firestore);

    // Configure generation queue (from environment or defaults)
    const queueConfig = {
      endpoint: process.env.GENERATION_QUEUE_ENDPOINT || "http://localhost:8080/generate",
      queueName: process.env.GENERATION_QUEUE_NAME || "photo-generation",
      geminiModel: process.env.GEMINI_MODEL || "gemini-2.0-flash-exp",
      maxAttempts: Number(process.env.GENERATION_MAX_ATTEMPTS) || 3,
      initialRetryDelaySeconds: Number(process.env.GENERATION_RETRY_DELAY) || 10,
    };

    // Execute use case
    const requestGenerationUseCase = requestGeneration(
      repository,
      mockEnqueueGenerationTask,
      queueConfig,
    );

    try {
      const session = await requestGenerationUseCase(currentUser.uid, {
        sessionId,
        themeId: body.themeId,
        promptSelections: body.promptSelections,
        requestedAt: new Date(),
      });

      // Return 202 Accepted with Retry-After header
      return NextResponse.json(
        {
          id: session.id,
          status: session.status,
          themeId: session.themeId,
        },
        {
          status: 202,
          headers: {
            "Retry-After": String(RETRY_AFTER_SECONDS),
          },
        },
      );
    } catch (useCaseError) {
      // Handle use case errors
      if (
        typeof useCaseError === "object" &&
        useCaseError !== null &&
        "type" in useCaseError
      ) {
        if (useCaseError.type === "session-not-found") {
          return NextResponse.json(
            { error: "Session not found" },
            { status: 404 },
          );
        }

        if (useCaseError.type === "unauthorized") {
          return NextResponse.json(
            { error: "Unauthorized - session does not belong to this user" },
            { status: 403 },
          );
        }

        if (useCaseError.type === "domain-error") {
          const errorMessage =
            "message" in useCaseError
              ? useCaseError.message
              : "Invalid session state";

          // Check if it's a "generation already in progress" error
          if (
            typeof errorMessage === "string" &&
            errorMessage.includes("generating")
          ) {
            return NextResponse.json(
              { error: "Generation already in progress" },
              { status: 409 },
            );
          }

          return NextResponse.json(
            { error: errorMessage },
            { status: 400 },
          );
        }

        if (useCaseError.type === "queue-error") {
          return NextResponse.json(
            { error: "Failed to queue generation request" },
            { status: 503 },
          );
        }
      }

      throw useCaseError;
    }
  } catch (error) {
    console.error("Error requesting generation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
