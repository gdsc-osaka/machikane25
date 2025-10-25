import { NextRequest, NextResponse } from "next/server";
import { getFirebaseClients } from "@/firebase";
import { createVisitorSessionRepository } from "@/infra/firestore/visitorSessionRepository";
import { createSession } from "@/application/visitorSession/createSession";

export const dynamic = "force-dynamic";

type CreateSessionRequestBody = {
  boothId: string;
};

export async function POST(request: NextRequest) {
  try {
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
    let body: CreateSessionRequestBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    if (!body.boothId || typeof body.boothId !== "string") {
      return NextResponse.json(
        { error: "boothId is required and must be a string" },
        { status: 400 },
      );
    }

    // Create repository
    const repository = createVisitorSessionRepository(firestore);

    // Execute use case
    const createSessionUseCase = createSession(repository);

    try {
      const session = await createSessionUseCase({
        anonymousUid: currentUser.uid,
        boothId: body.boothId,
        now: new Date(),
      });

      // Return session (serialize for JSON)
      return NextResponse.json(
        {
          id: session.id,
          status: session.status,
          themeId: session.themeId,
          expiresAt: session.expiresAt.toISOString(),
          publicTokenId: session.publicTokenId,
        },
        { status: 201 },
      );
    } catch (useCaseError) {
      // Handle use case errors
      if (
        typeof useCaseError === "object" &&
        useCaseError !== null &&
        "type" in useCaseError
      ) {
        if (useCaseError.type === "session-exists") {
          return NextResponse.json(
            {
              error: "Session already active for this device",
              sessionId:
                "sessionId" in useCaseError ? useCaseError.sessionId : undefined,
            },
            { status: 409 },
          );
        }

        if (useCaseError.type === "domain-error") {
          return NextResponse.json(
            {
              error:
                "message" in useCaseError
                  ? useCaseError.message
                  : "Domain validation failed",
            },
            { status: 400 },
          );
        }
      }

      throw useCaseError;
    }
  } catch (error) {
    console.error("Error creating session:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
