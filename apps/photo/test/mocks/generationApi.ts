import { http, HttpResponse } from "msw";

type CreateSessionRequest = {
  boothId: string;
};

type CaptureRequest = {
  originalImageRef: string;
};

type GenerateRequest = {
  themeId: string;
  promptSelections: Array<{ type: string; optionId: string }>;
};

// In-memory session store for tests
const sessions = new Map<string, any>();
let sessionIdCounter = 1;

export const generationApiHandlers = [
  // POST /api/photobooth/sessions - Create session
  http.post("/api/photobooth/sessions", async ({ request }) => {
    const body = (await request.json()) as CreateSessionRequest;

    if (!body.boothId) {
      return HttpResponse.json(
        { error: "boothId is required" },
        { status: 400 },
      );
    }

    // Check for existing active session
    const existingSession = Array.from(sessions.values()).find(
      (s) =>
        s.anonymousUid === "test-user-id" &&
        ["capturing", "selecting-theme", "generating"].includes(s.status),
    );

    if (existingSession) {
      return HttpResponse.json(
        {
          error: "Session already active for this device",
          sessionId: existingSession.id,
        },
        { status: 409 },
      );
    }

    // Create new session
    const sessionId = `session-test-${sessionIdCounter++}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 48 * 3600 * 1000);

    const session = {
      id: sessionId,
      anonymousUid: "test-user-id",
      status: "capturing",
      themeId: null,
      originalImageRef: null,
      generatedImageRef: null,
      publicTokenId: null,
      aquariumEventId: null,
      expiresAt: expiresAt.toISOString(),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      failureReason: null,
    };

    sessions.set(sessionId, session);

    return HttpResponse.json(
      {
        id: session.id,
        status: session.status,
        themeId: session.themeId,
        expiresAt: session.expiresAt,
        publicTokenId: session.publicTokenId,
      },
      { status: 201 },
    );
  }),

  // GET /api/photobooth/sessions/:sessionId - Get session
  http.get("/api/photobooth/sessions/:sessionId", ({ params }) => {
    const { sessionId } = params;
    const session = sessions.get(sessionId as string);

    if (!session) {
      return HttpResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return HttpResponse.json(session, { status: 200 });
  }),

  // POST /api/photobooth/sessions/:sessionId/capture - Capture photo
  http.post(
    "/api/photobooth/sessions/:sessionId/capture",
    async ({ params, request }) => {
      const { sessionId } = params;
      const session = sessions.get(sessionId as string);

      if (!session) {
        return HttpResponse.json(
          { error: "Session not found" },
          { status: 404 },
        );
      }

      if (session.status !== "capturing") {
        return HttpResponse.json(
          { error: "Invalid session state" },
          { status: 400 },
        );
      }

      const body = (await request.json()) as CaptureRequest;

      if (!body.originalImageRef) {
        return HttpResponse.json(
          { error: "originalImageRef is required" },
          { status: 400 },
        );
      }

      // Update session
      session.status = "selecting-theme";
      session.originalImageRef = body.originalImageRef;
      session.originalImageRetentionDeadline = new Date(
        Date.now() + 5 * 60 * 1000,
      ).toISOString();
      session.updatedAt = new Date().toISOString();

      return HttpResponse.json(
        {
          id: session.id,
          status: session.status,
          originalImageRef: session.originalImageRef,
          originalImageRetentionDeadline: session.originalImageRetentionDeadline,
        },
        { status: 200 },
      );
    },
  ),

  // POST /api/photobooth/sessions/:sessionId/generate - Request generation
  http.post(
    "/api/photobooth/sessions/:sessionId/generate",
    async ({ params, request }) => {
      const { sessionId } = params;
      const session = sessions.get(sessionId as string);

      if (!session) {
        return HttpResponse.json(
          { error: "Session not found" },
          { status: 404 },
        );
      }

      if (session.status !== "selecting-theme") {
        return HttpResponse.json(
          { error: "Generation already in progress" },
          { status: 409 },
        );
      }

      const body = (await request.json()) as GenerateRequest;

      if (!body.themeId) {
        return HttpResponse.json(
          { error: "themeId is required" },
          { status: 400 },
        );
      }

      if (!Array.isArray(body.promptSelections)) {
        return HttpResponse.json(
          { error: "promptSelections is required" },
          { status: 400 },
        );
      }

      // Update session to generating
      session.status = "generating";
      session.themeId = body.themeId;
      session.updatedAt = new Date().toISOString();

      // Simulate async generation completion after a delay
      setTimeout(() => {
        const currentSession = sessions.get(sessionId as string);
        if (currentSession && currentSession.status === "generating") {
          currentSession.status = "completed";
          currentSession.generatedImageRef = `generated/${sessionId}/result.png`;
          currentSession.publicTokenId = `token-${sessionId}`;
          currentSession.updatedAt = new Date().toISOString();
        }
      }, 100); // Complete after 100ms for fast tests

      return HttpResponse.json(
        {
          id: session.id,
          status: session.status,
          themeId: session.themeId,
        },
        {
          status: 202,
          headers: {
            "Retry-After": "5",
          },
        },
      );
    },
  ),

  // GET /api/photobooth/sessions/:sessionId/result - Get generated result
  http.get("/api/photobooth/sessions/:sessionId/result", ({ params }) => {
    const { sessionId } = params;
    const session = sessions.get(sessionId as string);

    if (!session) {
      return HttpResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (!session.generatedImageRef) {
      return HttpResponse.json(
        { error: "No generated asset available" },
        { status: 404 },
      );
    }

    return HttpResponse.json(
      {
        id: sessionId,
        sessionId: session.id,
        previewUrl: `https://storage.example.com/${session.generatedImageRef}`,
        storagePath: session.generatedImageRef,
        aquariumSyncStatus: "pending",
        expiresAt: session.expiresAt,
      },
      { status: 200 },
    );
  }),
];

// Helper for tests to reset state
export const resetGenerationApiMocks = () => {
  sessions.clear();
  sessionIdCounter = 1;
};

// Helper for tests to manually set session state
export const setMockSession = (sessionId: string, sessionData: any) => {
  sessions.set(sessionId, sessionData);
};

// Helper for tests to get session state
export const getMockSession = (sessionId: string) => {
  return sessions.get(sessionId);
};
