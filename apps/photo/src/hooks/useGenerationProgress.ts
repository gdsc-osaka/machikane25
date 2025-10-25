import { useEffect, useState } from "react";
import { VisitorSession } from "@/domain/visitorSession";

type GenerationProgressState = {
  isGenerating: boolean;
  progress: number;
  estimatedTimeRemaining: number | null;
  error: GenerationError | null;
};

type GenerationError = {
  type: "timeout" | "generation-failed" | "unknown";
  message: string;
};

const POLLING_INTERVAL_MS = 3000; // 3 seconds
const TIMEOUT_MS = 120000; // 2 minutes
const INITIAL_ESTIMATED_TIME_MS = 30000; // 30 seconds

const calculateProgress = (
  startTime: Date,
  currentTime: Date,
  estimatedTime: number,
): number => {
  const elapsed = currentTime.getTime() - startTime.getTime();
  const progress = Math.min((elapsed / estimatedTime) * 100, 95); // Cap at 95% until complete
  return Math.round(progress);
};

const calculateEstimatedTimeRemaining = (
  startTime: Date,
  currentTime: Date,
  estimatedTime: number,
): number | null => {
  const elapsed = currentTime.getTime() - startTime.getTime();
  const remaining = estimatedTime - elapsed;

  if (remaining <= 0) {
    return null; // Exceeded estimate
  }

  return Math.round(remaining / 1000); // Return in seconds
};

export type UseGenerationProgressReturn = GenerationProgressState;

export const useGenerationProgress = (
  session: Partial<VisitorSession> | null,
): UseGenerationProgressReturn => {
  const [state, setState] = useState<GenerationProgressState>({
    isGenerating: false,
    progress: 0,
    estimatedTimeRemaining: null,
    error: null,
  });

  useEffect(() => {
    if (!session) {
      setState({
        isGenerating: false,
        progress: 0,
        estimatedTimeRemaining: null,
        error: null,
      });
      return;
    }

    // Check session status
    const isGenerating = session.status === "generating";
    const isCompleted = session.status === "completed";
    const isFailed = session.status === "failed";

    if (isFailed) {
      setState({
        isGenerating: false,
        progress: 0,
        estimatedTimeRemaining: null,
        error: {
          type: "generation-failed",
          message: session.failureReason || "Generation failed",
        },
      });
      return;
    }

    if (isCompleted) {
      setState({
        isGenerating: false,
        progress: 100,
        estimatedTimeRemaining: 0,
        error: null,
      });
      return;
    }

    if (!isGenerating) {
      setState({
        isGenerating: false,
        progress: 0,
        estimatedTimeRemaining: null,
        error: null,
      });
      return;
    }

    // Generation is in progress
    // Get generation start time from status history
    const generatingEntry = session.statusHistory?.find(
      (entry) => entry.status === "generating",
    );

    if (!generatingEntry) {
      // If no history, assume just started
      setState({
        isGenerating: true,
        progress: 5,
        estimatedTimeRemaining: Math.round(INITIAL_ESTIMATED_TIME_MS / 1000),
        error: null,
      });
      return;
    }

    const startTime = generatingEntry.occurredAt;

    // Set up polling to update progress
    const intervalId = setInterval(() => {
      const now = new Date();
      const elapsed = now.getTime() - startTime.getTime();

      // Check for timeout
      if (elapsed > TIMEOUT_MS) {
        setState({
          isGenerating: true,
          progress: 95,
          estimatedTimeRemaining: null,
          error: {
            type: "timeout",
            message: "Generation taking longer than expected",
          },
        });
        return;
      }

      // Calculate progress
      const progress = calculateProgress(
        startTime,
        now,
        INITIAL_ESTIMATED_TIME_MS,
      );

      const estimatedTimeRemaining = calculateEstimatedTimeRemaining(
        startTime,
        now,
        INITIAL_ESTIMATED_TIME_MS,
      );

      setState({
        isGenerating: true,
        progress,
        estimatedTimeRemaining,
        error: null,
      });
    }, POLLING_INTERVAL_MS);

    // Initial state
    const now = new Date();
    const progress = calculateProgress(
      startTime,
      now,
      INITIAL_ESTIMATED_TIME_MS,
    );
    const estimatedTimeRemaining = calculateEstimatedTimeRemaining(
      startTime,
      now,
      INITIAL_ESTIMATED_TIME_MS,
    );

    setState({
      isGenerating: true,
      progress,
      estimatedTimeRemaining,
      error: null,
    });

    return () => {
      clearInterval(intervalId);
    };
  }, [session]);

  return state;
};
