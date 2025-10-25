"use client";

import { useEffect, useState } from "react";
import { useVisitorSession } from "@/hooks/useVisitorSession";
import { useGenerationProgress } from "@/hooks/useGenerationProgress";

type BoothState =
  | "countdown"
  | "consent"
  | "capture"
  | "theme-selection"
  | "generating"
  | "completed"
  | "failed";

const COUNTDOWN_SECONDS = 3;
const BOOTH_ID = "booth-001"; // In production, this would come from device config

const themes = [
  { id: "theme-fireworks", nameEn: "Fireworks", nameJa: "花火" },
  { id: "theme-aquarium", nameEn: "Aquarium", nameJa: "水族館" },
  { id: "theme-sakura", nameEn: "Sakura", nameJa: "桜" },
  { id: "theme-neon", nameEn: "Neon City", nameJa: "ネオンシティ" },
];

export function BoothPage() {
  const [boothState, setBoothState] = useState<BoothState>("countdown");
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [capturedImageUrl, setCapturedImageUrl] = useState<string | null>(null);

  const { session, isLoading, error, createSession, updateSession } =
    useVisitorSession(sessionId ?? undefined);

  const generationProgress = useGenerationProgress(session);

  // Handle countdown
  useEffect(() => {
    if (boothState === "countdown" && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);

      return () => clearTimeout(timer);
    }

    if (boothState === "countdown" && countdown === 0) {
      setBoothState("consent");
    }
  }, [boothState, countdown]);

  // Initialize state based on session on first render
  useEffect(() => {
    if (!session) return;

    // If session exists but we're in countdown, skip to consent first
    if (boothState === "countdown" && session.status === "capturing") {
      setBoothState("consent");
      return;
    }

    // Don't auto-transition from consent to capture unless user accepted consent
    if (boothState === "consent" && session.status === "capturing" && !consentAccepted) {
      return;
    }

    // Sync booth state with session state for other phases
    if (session.status === "capturing" && boothState !== "consent") {
      setBoothState("capture");
    } else if (session.status === "capturing" && boothState === "consent" && consentAccepted) {
      setBoothState("capture");
    } else if (session.status === "selecting-theme") {
      setBoothState("theme-selection");
    } else if (session.status === "generating") {
      setBoothState("generating");
    } else if (session.status === "completed") {
      setBoothState("completed");
    } else if (session.status === "failed") {
      setBoothState("failed");
    }
  }, [session, boothState, consentAccepted]);

  // Poll for updates during generation
  useEffect(() => {
    if (boothState === "generating" && sessionId) {
      const pollInterval = setInterval(() => {
        updateSession();
      }, 5000); // Poll every 5 seconds

      return () => clearInterval(pollInterval);
    }
  }, [boothState, sessionId, updateSession]);

  const handleConsentAccept = async () => {
    setConsentAccepted(true);

    // Create session
    try {
      const newSession = await createSession(BOOTH_ID);
      setSessionId(newSession.id ?? null);
      // State transition will be handled by useEffect based on session status
    } catch (err) {
      console.error("Failed to create session:", err);
      alert("Failed to create session. Please try again.");
    }
  };

  const handleCapture = async () => {
    if (!sessionId) return;

    // In production, this would capture from camera
    // For now, simulate with a placeholder
    const mockImageUrl = "https://via.placeholder.com/800x600.jpg";
    setCapturedImageUrl(mockImageUrl);

    try {
      // Upload image and update session
      const response = await fetch(
        `/api/photobooth/sessions/${sessionId}/capture`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            originalImageRef: `originals/${sessionId}/photo.jpg`,
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to capture photo");
      }

      await updateSession();
      setBoothState("theme-selection");
    } catch (err) {
      console.error("Failed to capture photo:", err);
      alert("Failed to capture photo. Please try again.");
    }
  };

  const handleThemeSelect = async (themeId: string) => {
    setSelectedTheme(themeId);
  };

  const handleGenerateRequest = async () => {
    if (!sessionId || !selectedTheme) return;

    try {
      const response = await fetch(
        `/api/photobooth/sessions/${sessionId}/generate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            themeId: selectedTheme,
            promptSelections: [
              { type: "location", optionId: "option-1" },
              { type: "style", optionId: "option-2" },
            ],
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to request generation");
      }

      await updateSession();
      setBoothState("generating");
    } catch (err) {
      console.error("Failed to request generation:", err);
      alert("Failed to request generation. Please try again.");
    }
  };

  const handleRetry = () => {
    setBoothState("countdown");
    setCountdown(COUNTDOWN_SECONDS);
    setConsentAccepted(false);
    setSelectedTheme(null);
    setSessionId(null);
    setCapturedImageUrl(null);
  };

  // Render countdown
  if (boothState === "countdown") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
        <div className="text-center">
          <h1 className="mb-8 text-6xl font-bold text-white">Get Ready!</h1>
          {countdown > 0 ? (
            <div className="text-9xl font-bold text-white">{countdown}</div>
          ) : (
            <div className="text-4xl font-bold text-white">Let&apos;s go!</div>
          )}
        </div>
      </div>
    );
  }

  // Render consent
  if (boothState === "consent") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 p-8">
        <div className="max-w-2xl rounded-lg bg-white p-8 shadow-lg">
          <h2 className="mb-6 text-3xl font-bold">AI Photo Booth</h2>
          <div className="mb-6 space-y-4 text-gray-700">
            <p>Welcome to the AI Photo Booth experience!</p>
            <p>By proceeding, you will:</p>
            <ul className="list-inside list-disc space-y-2">
              <li>Have your photo processed by AI to create artwork</li>
              <li>Allow display of generated images in the aquarium exhibit</li>
              <li>Photo retention for 48 hours maximum</li>
            </ul>
          </div>
          <div className="mb-6">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={consentAccepted}
                onChange={(e) => setConsentAccepted(e.target.checked)}
                className="h-5 w-5"
                aria-label="I agree to the terms and consent to photo processing"
              />
              <span>I agree to the terms and consent to photo processing</span>
            </label>
          </div>
          <button
            onClick={handleConsentAccept}
            disabled={!consentAccepted || isLoading}
            className="w-full rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:bg-gray-400"
            type="button"
            aria-label="Continue to capture photo"
          >
            {isLoading ? "Creating Session..." : "Continue"}
          </button>
        </div>
      </div>
    );
  }

  // Render capture
  if (boothState === "capture") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900 p-8">
        <div className="text-center">
          <h2 className="mb-8 text-4xl font-bold text-white">Smile!</h2>
          <div className="mb-8 flex h-96 w-96 items-center justify-center rounded-lg bg-gray-800">
            <span className="text-gray-400">Camera Preview</span>
          </div>
          <button
            onClick={handleCapture}
            className="rounded-lg bg-green-600 px-8 py-4 text-xl font-semibold text-white hover:bg-green-700"
            type="button"
            aria-label="Capture photo"
          >
            Take Photo
          </button>
        </div>
      </div>
    );
  }

  // Render theme selection
  if (boothState === "theme-selection") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 p-8">
        <h2 className="mb-8 text-4xl font-bold">Choose Your Theme</h2>
        <div className="mb-8 grid grid-cols-2 gap-6">
          {themes.map((theme) => (
            <button
              key={theme.id}
              onClick={() => handleThemeSelect(theme.id)}
              className={`rounded-lg border-4 p-8 text-center transition-all ${
                selectedTheme === theme.id
                  ? "border-blue-600 bg-blue-50"
                  : "border-gray-300 bg-white hover:border-blue-400"
              }`}
              type="button"
              aria-pressed={selectedTheme === theme.id}
              aria-label={`Theme: ${theme.nameEn}`}
              data-theme-id={theme.id}
            >
              <div className="text-2xl font-bold">
                {theme.nameEn} / {theme.nameJa}
              </div>
            </button>
          ))}
        </div>
        <button
          onClick={handleGenerateRequest}
          disabled={!selectedTheme}
          className="rounded-lg bg-purple-600 px-8 py-4 text-xl font-semibold text-white hover:bg-purple-700 disabled:bg-gray-400"
          type="button"
        >
          Generate AI Artwork
        </button>
      </div>
    );
  }

  // Render generating
  if (boothState === "generating") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-500 to-pink-600 p-8">
        <div className="text-center text-white">
          <h2 className="mb-8 text-4xl font-bold">Generating Your Masterpiece</h2>
          <div className="mb-8" data-testid="spinner">
            <div
              className="mx-auto h-4 w-96 overflow-hidden rounded-full bg-white/20"
              role="progressbar"
              aria-valuenow={generationProgress.progress}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full bg-white transition-all duration-500"
                style={{ width: `${generationProgress.progress}%` }}
              />
            </div>
            <p className="mt-4 text-xl">
              {generationProgress.progress}% complete
            </p>
            {generationProgress.estimatedTimeRemaining !== null && (
              <p className="mt-2 text-lg opacity-80">
                Estimated time: {generationProgress.estimatedTimeRemaining}s
              </p>
            )}
          </div>
          {generationProgress.error && (
            <div className="rounded-lg bg-yellow-500/20 p-4 text-yellow-100">
              <p className="font-semibold">
                This is taking longer than expected - please wait or check back later (results available for 48 hours)
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Render completed
  if (boothState === "completed") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 p-8">
        <div className="max-w-4xl text-center">
          <h2 className="mb-8 text-4xl font-bold text-green-600">
            Success! Your AI Artwork is Ready
          </h2>
          <div className="mb-8 rounded-lg bg-white p-8 shadow-lg">
            <img
              src={session?.generatedImageRef || "https://via.placeholder.com/800x600"}
              alt="Generated AI artwork"
              className="mx-auto max-h-96 rounded-lg"
            />
          </div>
          <div className="mb-8 rounded-lg bg-white p-6 shadow-lg">
            <p className="mb-4 text-xl font-semibold">
              Get Your Image
            </p>
            <div
              className="mx-auto mb-4 h-48 w-48 bg-gray-200"
              data-testid="qr-code"
            >
              <span className="flex h-full items-center justify-center text-gray-500">
                QR Code
              </span>
            </div>
            <p className="text-gray-600">
              Scan this QR code to download and retrieve your image (available for 48 hours)
            </p>
          </div>
          <button
            onClick={handleRetry}
            className="rounded-lg bg-blue-600 px-8 py-3 font-semibold text-white hover:bg-blue-700"
            type="button"
          >
            Create Another
          </button>
        </div>
      </div>
    );
  }

  // Render failed
  if (boothState === "failed") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 p-8">
        <div className="max-w-2xl text-center">
          <h2 className="mb-6 text-4xl font-bold text-red-600">
            Something Went Wrong
          </h2>
          <div className="mb-8 rounded-lg bg-white p-8 shadow-lg">
            <p className="mb-4 text-xl text-gray-700">
              {session?.failureReason || "Generation failed or unavailable - please try again"}
            </p>
            <p className="text-gray-600">
              Contact staff if the problem persists.
            </p>
          </div>
          <button
            onClick={handleRetry}
            className="rounded-lg bg-blue-600 px-8 py-3 font-semibold text-white hover:bg-blue-700"
            type="button"
            aria-label="Try again"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return null;
}

export default BoothPage;
