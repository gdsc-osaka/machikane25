import { NextRequest, NextResponse } from "next/server";
import { getFirebaseClients } from "@/firebase";
import { createVisitorSessionRepository } from "@/infra/firestore/visitorSessionRepository";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    sessionId: string;
  }>;
};

export async function GET(
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

    // Create repository
    const repository = createVisitorSessionRepository(firestore);

    // Fetch session
    const session = await repository.findById(sessionId);

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 },
      );
    }

    // Verify ownership
    if (session.anonymousUid !== currentUser.uid) {
      return NextResponse.json(
        { error: "Unauthorized - session does not belong to this user" },
        { status: 403 },
      );
    }

    // Return session (serialize for JSON)
    return NextResponse.json(
      {
        id: session.id,
        status: session.status,
        themeId: session.themeId,
        originalImageRef: session.originalImageRef,
        generatedImageRef: session.generatedImageRef,
        expiresAt: session.expiresAt.toISOString(),
        publicTokenId: session.publicTokenId,
        aquariumEventId: session.aquariumEventId,
        failureReason: session.failureReason,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching session:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
