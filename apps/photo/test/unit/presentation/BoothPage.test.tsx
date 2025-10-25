import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, within, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BoothPage } from "@/app/(surfaces)/booth/page";

// Mock hooks that will be used by BoothPage
vi.mock("@/hooks/useVisitorSession", () => ({
  useVisitorSession: vi.fn(),
}));

vi.mock("@/hooks/useGenerationProgress", () => ({
  useGenerationProgress: vi.fn(),
}));

// Import mocked hooks for control in tests
import { useVisitorSession } from "@/hooks/useVisitorSession";
import { useGenerationProgress } from "@/hooks/useGenerationProgress";

describe("BoothPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("Initial countdown", () => {
    it("should display countdown timer before capture", () => {
      vi.mocked(useVisitorSession).mockReturnValue({
        session: null,
        isLoading: false,
        error: null,
        createSession: vi.fn(),
        updateSession: vi.fn(),
      });

      render(<BoothPage />);

      // Should show countdown (e.g., "3... 2... 1...")
      expect(screen.getByText(/get ready/i)).toBeInTheDocument();
    });

    it("should count down from 3 to 1 before enabling capture", async () => {
      vi.mocked(useVisitorSession).mockReturnValue({
        session: null,
        isLoading: false,
        error: null,
        createSession: vi.fn(),
        updateSession: vi.fn(),
      });

      render(<BoothPage />);

      // Initial state - countdown should show 3
      expect(screen.getByText(/3/)).toBeInTheDocument();

      // Advance timer by 1 second and flush updates
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });
      expect(screen.getByText(/2/)).toBeInTheDocument();

      // Advance timer by another second
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });
      expect(screen.getByText(/1/)).toBeInTheDocument();

      // After countdown, consent screen should appear
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });
      expect(screen.getByRole("button", { name: /continue/i })).toBeInTheDocument();
    });
  });

  describe("Consent gating", () => {
    it("should display consent dialog before allowing photo capture", () => {
      vi.mocked(useVisitorSession).mockReturnValue({
        session: {
          id: "session-1",
          anonymousUid: "anon-1",
          status: "capturing",
          themeId: null,
          originalImageRef: null,
          generatedImageRef: null,
          publicTokenId: null,
          aquariumEventId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          expiresAt: new Date(Date.now() + 48 * 3600 * 1000),
          originalImageRetentionDeadline: null,
          statusHistory: [],
          failureReason: null,
        },
        isLoading: false,
        error: null,
        createSession: vi.fn(),
        updateSession: vi.fn(),
      });

      render(<BoothPage />);

      // Should show consent checkbox or button
      expect(
        screen.getByText(/agree|consent|accept/i)
      ).toBeInTheDocument();
    });

    it("should require consent acceptance before proceeding", async () => {
      const mockCreateSession = vi.fn().mockResolvedValue({
        id: "session-1",
        status: "capturing",
        themeId: null,
        expiresAt: new Date(Date.now() + 48 * 3600 * 1000),
        publicTokenId: null,
      });

      vi.mocked(useVisitorSession).mockReturnValue({
        session: null,
        isLoading: false,
        error: null,
        createSession: mockCreateSession,
        updateSession: vi.fn(),
      });

      render(<BoothPage />);

      // Fast forward past countdown - advance in steps to ensure React updates
      await act(async () => {
        vi.advanceTimersByTime(1000); // countdown: 3 -> 2
      });
      await act(async () => {
        vi.advanceTimersByTime(1000); // countdown: 2 -> 1
      });
      await act(async () => {
        vi.advanceTimersByTime(1000); // countdown: 1 -> 0
      });
      await act(async () => {
        vi.advanceTimersByTime(10); // Trigger transition to consent
      });

      // Check for consent screen by looking for the heading
      expect(screen.getByRole("heading", { name: /ai photo booth/i })).toBeInTheDocument();

      const continueButton = screen.getByRole("button", { name: /continue/i });

      // Initially, continue button should be disabled without consent
      expect(continueButton).toBeDisabled();

      // Switch to real timers for user interaction
      vi.useRealTimers();
      const user = userEvent.setup({ delay: null });

      // Accept consent
      const consentCheckbox = screen.getByRole("checkbox");
      await user.click(consentCheckbox);

      // Now continue should be enabled
      expect(continueButton).toBeEnabled();

      // Restore fake timers
      vi.useFakeTimers();
    });
  });

  describe("Theme selection", () => {
    it("should display theme gallery after photo capture", () => {
      vi.mocked(useVisitorSession).mockReturnValue({
        session: {
          id: "session-1",
          anonymousUid: "anon-1",
          status: "selecting-theme",
          themeId: null,
          originalImageRef: "originals/session-1/photo.jpg",
          generatedImageRef: null,
          publicTokenId: null,
          aquariumEventId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          expiresAt: new Date(Date.now() + 48 * 3600 * 1000),
          originalImageRetentionDeadline: new Date(Date.now() + 5 * 60 * 1000),
          statusHistory: [],
          failureReason: null,
        },
        isLoading: false,
        error: null,
        createSession: vi.fn(),
        updateSession: vi.fn(),
      });

      render(<BoothPage />);

      // Should display theme selection UI
      expect(screen.getByText(/choose your theme/i)).toBeInTheDocument();

      // Should have at least one theme option (Fireworks, Aquarium, etc.)
      expect(screen.getByText(/fireworks/i)).toBeInTheDocument();
    });

    it("should highlight selected theme", async () => {
      // Use real timers for this test to avoid userEvent timing issues
      vi.useRealTimers();
      const user = userEvent.setup({ delay: null });

      vi.mocked(useVisitorSession).mockReturnValue({
        session: {
          id: "session-1",
          anonymousUid: "anon-1",
          status: "selecting-theme",
          themeId: null,
          originalImageRef: "originals/session-1/photo.jpg",
          generatedImageRef: null,
          publicTokenId: null,
          aquariumEventId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          expiresAt: new Date(Date.now() + 48 * 3600 * 1000),
          originalImageRetentionDeadline: new Date(Date.now() + 5 * 60 * 1000),
          statusHistory: [],
          failureReason: null,
        },
        isLoading: false,
        error: null,
        createSession: vi.fn(),
        updateSession: vi.fn(),
      });

      render(<BoothPage />);

      const themeButtons = screen.getAllByRole("button", { name: /theme/i });
      const firstTheme = themeButtons[0];

      // Click first theme
      await user.click(firstTheme);

      // Theme should be visually selected (aria-pressed or similar)
      expect(firstTheme).toHaveAttribute("aria-pressed", "true");

      // Restore fake timers for other tests
      vi.useFakeTimers();
    });

    it("should display localized theme names", () => {
      vi.mocked(useVisitorSession).mockReturnValue({
        session: {
          id: "session-1",
          anonymousUid: "anon-1",
          status: "selecting-theme",
          themeId: null,
          originalImageRef: "originals/session-1/photo.jpg",
          generatedImageRef: null,
          publicTokenId: null,
          aquariumEventId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          expiresAt: new Date(Date.now() + 48 * 3600 * 1000),
          originalImageRetentionDeadline: new Date(Date.now() + 5 * 60 * 1000),
          statusHistory: [],
          failureReason: null,
        },
        isLoading: false,
        error: null,
        createSession: vi.fn(),
        updateSession: vi.fn(),
      });

      render(<BoothPage />);

      // Should display themes with i18n labels (English or Japanese)
      // Example themes from spec: fireworks, aquarium, etc.
      expect(
        screen.getByText(/fireworks|花火/i) || screen.getByText(/aquarium|水族館/i)
      ).toBeInTheDocument();
    });
  });

  describe("Generation progress", () => {
    it("should show generating status with progress indicator", () => {
      vi.mocked(useVisitorSession).mockReturnValue({
        session: {
          id: "session-1",
          anonymousUid: "anon-1",
          status: "generating",
          themeId: "theme-fireworks",
          originalImageRef: "originals/session-1/photo.jpg",
          generatedImageRef: null,
          publicTokenId: null,
          aquariumEventId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          expiresAt: new Date(Date.now() + 48 * 3600 * 1000),
          originalImageRetentionDeadline: new Date(Date.now() + 5 * 60 * 1000),
          statusHistory: [],
          failureReason: null,
        },
        isLoading: false,
        error: null,
        createSession: vi.fn(),
        updateSession: vi.fn(),
      });

      vi.mocked(useGenerationProgress).mockReturnValue({
        isGenerating: true,
        progress: 45,
        estimatedTimeRemaining: 15,
        error: null,
      });

      render(<BoothPage />);

      // Should show generating message
      expect(screen.getByText(/generating|creating|processing/i)).toBeInTheDocument();

      // Should show progress indicator (spinner, progress bar, etc.)
      expect(screen.getByRole("progressbar") || screen.getByTestId("spinner")).toBeInTheDocument();
    });

    it("should poll for generation completion", async () => {
      const mockUseGenerationProgress = vi.mocked(useGenerationProgress);

      // Initially generating
      mockUseGenerationProgress.mockReturnValue({
        isGenerating: true,
        progress: 30,
        estimatedTimeRemaining: 20,
        error: null,
      });

      vi.mocked(useVisitorSession).mockReturnValue({
        session: {
          id: "session-1",
          anonymousUid: "anon-1",
          status: "generating",
          themeId: "theme-fireworks",
          originalImageRef: "originals/session-1/photo.jpg",
          generatedImageRef: null,
          publicTokenId: null,
          aquariumEventId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          expiresAt: new Date(Date.now() + 48 * 3600 * 1000),
          originalImageRetentionDeadline: new Date(Date.now() + 5 * 60 * 1000),
          statusHistory: [],
          failureReason: null,
        },
        isLoading: false,
        error: null,
        createSession: vi.fn(),
        updateSession: vi.fn(),
      });

      const { rerender } = render(<BoothPage />);

      expect(screen.getByText(/generating/i)).toBeInTheDocument();

      // Simulate polling update - generation complete
      mockUseGenerationProgress.mockReturnValue({
        isGenerating: false,
        progress: 100,
        estimatedTimeRemaining: 0,
        error: null,
      });

      vi.mocked(useVisitorSession).mockReturnValue({
        session: {
          id: "session-1",
          anonymousUid: "anon-1",
          status: "completed",
          themeId: "theme-fireworks",
          originalImageRef: "originals/session-1/photo.jpg",
          generatedImageRef: "generated/session-1/result.png",
          publicTokenId: "token-123",
          aquariumEventId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          expiresAt: new Date(Date.now() + 48 * 3600 * 1000),
          originalImageRetentionDeadline: new Date(Date.now() + 5 * 60 * 1000),
          statusHistory: [],
          failureReason: null,
        },
        isLoading: false,
        error: null,
        createSession: vi.fn(),
        updateSession: vi.fn(),
      });

      rerender(<BoothPage />);

      // After rerender with completed status, success message should appear
      expect(screen.getByText(/complete|success|ready/i)).toBeInTheDocument();
    });
  });

  describe("Success state", () => {
    it("should display generated image on completion", () => {
      vi.mocked(useVisitorSession).mockReturnValue({
        session: {
          id: "session-1",
          anonymousUid: "anon-1",
          status: "completed",
          themeId: "theme-fireworks",
          originalImageRef: "originals/session-1/photo.jpg",
          generatedImageRef: "generated/session-1/result.png",
          publicTokenId: "token-123",
          aquariumEventId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          expiresAt: new Date(Date.now() + 48 * 3600 * 1000),
          originalImageRetentionDeadline: new Date(Date.now() + 5 * 60 * 1000),
          statusHistory: [],
          failureReason: null,
        },
        isLoading: false,
        error: null,
        createSession: vi.fn(),
        updateSession: vi.fn(),
      });

      vi.mocked(useGenerationProgress).mockReturnValue({
        isGenerating: false,
        progress: 100,
        estimatedTimeRemaining: 0,
        error: null,
      });

      render(<BoothPage />);

      // Should display the generated image
      const generatedImage = screen.getByRole("img", { name: /generated|result/i });
      expect(generatedImage).toBeInTheDocument();
      expect(generatedImage).toHaveAttribute("src", expect.stringContaining("generated"));
    });

    it("should display QR code for mobile download", () => {
      vi.mocked(useVisitorSession).mockReturnValue({
        session: {
          id: "session-1",
          anonymousUid: "anon-1",
          status: "completed",
          themeId: "theme-fireworks",
          originalImageRef: "originals/session-1/photo.jpg",
          generatedImageRef: "generated/session-1/result.png",
          publicTokenId: "token-123",
          aquariumEventId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          expiresAt: new Date(Date.now() + 48 * 3600 * 1000),
          originalImageRetentionDeadline: new Date(Date.now() + 5 * 60 * 1000),
          statusHistory: [],
          failureReason: null,
        },
        isLoading: false,
        error: null,
        createSession: vi.fn(),
        updateSession: vi.fn(),
      });

      vi.mocked(useGenerationProgress).mockReturnValue({
        isGenerating: false,
        progress: 100,
        estimatedTimeRemaining: 0,
        error: null,
      });

      render(<BoothPage />);

      // Should display QR code
      expect(screen.getByTestId("qr-code") || screen.getByText(/scan|qr/i)).toBeInTheDocument();

      // Should display download instructions
      expect(screen.getByText(/download|retrieve|48.*hour/i)).toBeInTheDocument();
    });
  });

  describe("Timeout state", () => {
    it("should display timeout message when generation takes too long", () => {
      vi.mocked(useVisitorSession).mockReturnValue({
        session: {
          id: "session-1",
          anonymousUid: "anon-1",
          status: "generating",
          themeId: "theme-fireworks",
          originalImageRef: "originals/session-1/photo.jpg",
          generatedImageRef: null,
          publicTokenId: null,
          aquariumEventId: null,
          createdAt: new Date(Date.now() - 120000), // 2 minutes ago
          updatedAt: new Date(Date.now() - 120000),
          expiresAt: new Date(Date.now() + 48 * 3600 * 1000),
          originalImageRetentionDeadline: new Date(Date.now() + 5 * 60 * 1000),
          statusHistory: [],
          failureReason: null,
        },
        isLoading: false,
        error: null,
        createSession: vi.fn(),
        updateSession: vi.fn(),
      });

      vi.mocked(useGenerationProgress).mockReturnValue({
        isGenerating: true,
        progress: 45,
        estimatedTimeRemaining: null, // Timeout - no estimate
        error: { type: "timeout", message: "Generation taking longer than expected" },
      });

      render(<BoothPage />);

      // Should display timeout or "still processing" message
      expect(
        screen.getByText(/taking longer|still processing|please wait/i)
      ).toBeInTheDocument();

      // Should provide guidance (e.g., check back later)
      expect(
        screen.getByText(/check back|return later|48.*hour/i)
      ).toBeInTheDocument();
    });

    it("should display retry option on failure", () => {
      vi.mocked(useVisitorSession).mockReturnValue({
        session: {
          id: "session-1",
          anonymousUid: "anon-1",
          status: "failed",
          themeId: "theme-fireworks",
          originalImageRef: "originals/session-1/photo.jpg",
          generatedImageRef: null,
          publicTokenId: null,
          aquariumEventId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          expiresAt: new Date(Date.now() + 48 * 3600 * 1000),
          originalImageRetentionDeadline: new Date(Date.now() + 5 * 60 * 1000),
          statusHistory: [],
          failureReason: "Generation service unavailable",
        },
        isLoading: false,
        error: null,
        createSession: vi.fn(),
        updateSession: vi.fn(),
      });

      vi.mocked(useGenerationProgress).mockReturnValue({
        isGenerating: false,
        progress: 0,
        estimatedTimeRemaining: null,
        error: { type: "generation-failed", message: "Generation service unavailable" },
      });

      render(<BoothPage />);

      // Should show error message
      expect(screen.getByText(/failed|error|unavailable/i)).toBeInTheDocument();

      // Should have retry button
      expect(screen.getByRole("button", { name: /retry|try again/i })).toBeInTheDocument();
    });
  });
});
