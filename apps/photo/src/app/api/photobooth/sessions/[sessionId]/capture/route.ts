import { NextRequest, NextResponse } from "next/server";
import { getFirebaseClients } from "@/firebase";
import { createVisitorSessionRepository } from "@/infra/firestore/visitorSessionRepository";
import { capturePhoto } from "@/application/visitorSession/capturePhoto";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    sessionId: string;
  }>;
};

type CaptureRequestBody = {
  originalImageRef: string;
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
    let body: CaptureRequestBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    if (!body.originalImageRef || typeof body.originalImageRef !== "string") {
      return NextResponse.json(
        { error: "originalImageRef is required and must be a string" },
        { status: 400 },
      );
    }

    // Create repository
    const repository = createVisitorSessionRepository(firestore);

    // Execute use case
    const capturePhotoUseCase = capturePhoto(repository);

    try {
      const session = await capturePhotoUseCase(currentUser.uid, {
        sessionId,
        originalImageRef: body.originalImageRef,
        capturedAt: new Date(),
      });

      // Return updated session
      return NextResponse.json(
        {
          id: session.id,
          status: session.status,
          originalImageRef: session.originalImageRef,
          originalImageRetentionDeadline: session.originalImageRetentionDeadline
            ? session.originalImageRetentionDeadline.toISOString()
            : null,
        },
        { status: 200 },
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
          return NextResponse.json(
            {
              error:
                "message" in useCaseError
                  ? useCaseError.message
                  : "Invalid session state",
            },
            { status: 400 },
          );
        }
      }

      throw useCaseError;
    }
  } catch (error) {
    console.error("Error capturing photo:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
