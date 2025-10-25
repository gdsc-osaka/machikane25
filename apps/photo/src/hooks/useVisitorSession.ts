import useSWR from "swr";
import { VisitorSession } from "@/domain/visitorSession";

type SessionApiResponse = {
  id: string;
  status: string;
  themeId: string | null;
  originalImageRef: string | null;
  generatedImageRef: string | null;
  expiresAt: string;
  publicTokenId: string | null;
  aquariumEventId: string | null;
  failureReason: string | null;
};

type CreateSessionResponse = {
  id: string;
  status: string;
  themeId: string | null;
  expiresAt: string;
  publicTokenId: string | null;
};

type SessionError = {
  error: string;
  sessionId?: string;
};

const parseSession = (data: SessionApiResponse): Partial<VisitorSession> => ({
  id: data.id,
  status: data.status as VisitorSession["status"],
  themeId: data.themeId,
  originalImageRef: data.originalImageRef,
  generatedImageRef: data.generatedImageRef,
  expiresAt: new Date(data.expiresAt),
  publicTokenId: data.publicTokenId,
  aquariumEventId: data.aquariumEventId,
  failureReason: data.failureReason,
});

const sessionFetcher = async (url: string): Promise<Partial<VisitorSession> | null> => {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  const data = await response.json();
  return parseSession(data);
};

export type UseVisitorSessionReturn = {
  session: Partial<VisitorSession> | null;
  isLoading: boolean;
  error: Error | null;
  createSession: (boothId: string) => Promise<Partial<VisitorSession>>;
  updateSession: () => Promise<void>;
};

export const useVisitorSession = (
  sessionId?: string,
): UseVisitorSessionReturn => {
  const shouldFetch = Boolean(sessionId);
  const url = sessionId ? `/api/photobooth/sessions/${sessionId}` : null;

  const { data, error, mutate, isLoading } = useSWR<Partial<VisitorSession> | null>(
    shouldFetch ? url : null,
    sessionFetcher,
    {
      refreshInterval: 0, // Don't auto-refresh by default
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      shouldRetryOnError: false,
    },
  );

  const createSession = async (boothId: string): Promise<Partial<VisitorSession>> => {
    const response = await fetch("/api/photobooth/sessions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ boothId }),
    });

    if (!response.ok) {
      const errorData: SessionError = await response.json().catch(() => ({
        error: "Unknown error",
      }));

      if (response.status === 409 && errorData.sessionId) {
        // Session already exists, fetch it
        const existingSession = await sessionFetcher(
          `/api/photobooth/sessions/${errorData.sessionId}`,
        );
        if (existingSession) {
          return existingSession;
        }
      }

      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const sessionData: CreateSessionResponse = await response.json();
    const session: Partial<VisitorSession> = {
      id: sessionData.id,
      status: sessionData.status as VisitorSession["status"],
      themeId: sessionData.themeId,
      expiresAt: new Date(sessionData.expiresAt),
      publicTokenId: sessionData.publicTokenId,
    };

    // Update SWR cache
    await mutate(session, false);

    return session;
  };

  const updateSession = async (): Promise<void> => {
    await mutate();
  };

  return {
    session: data ?? null,
    isLoading,
    error: error || null,
    createSession,
    updateSession,
  };
};
