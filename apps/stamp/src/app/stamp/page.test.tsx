import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import type { AwardStampResult } from "@/features/stamps/server/award-stamp";
import * as StampPageModule from "./page";

const pushMock = vi.fn();
let searchParamsInstance = new URLSearchParams("token=test-token");

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => searchParamsInstance,
}));

vi.mock("@/features/stamps/components/stamp-feedback", () => ({
  StampFeedback: ({
    title,
    description,
    actions,
  }: {
    title: string;
    description: ReactNode;
    actions: ReactNode;
  }) => (
    <div data-testid="stamp-feedback">
      <h2>{title}</h2>
      <div data-testid="stamp-feedback-description">{description}</div>
      <div data-testid="stamp-feedback-actions">{actions}</div>
    </div>
  ),
}));

vi.mock("@/lib/i18n/messages", () => ({
  translate: (key: string, locale: string) => `${key}-${locale}`,
}));

const createDeferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
};

describe("StampPage", () => {
  const originalLanguage = navigator.language;

  beforeEach(() => {
    pushMock.mockReset();
    searchParamsInstance = new URLSearchParams("token=test-token");
    Object.defineProperty(window.navigator, "language", {
      configurable: true,
      value: "ja-JP",
    });
  });

  afterEach(() => {
    Object.defineProperty(window.navigator, "language", {
      configurable: true,
      value: originalLanguage,
    });
    vi.restoreAllMocks();
  });

  it("shows loading spinner while awarding and renders success feedback", async () => {
    const fetchDeferred = createDeferred<Response>();
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() => fetchDeferred.promise);

    const { container } = render(<StampPageModule.default />);

    await waitFor(() =>
      expect(fetchSpy).toHaveBeenCalledWith(
        "/api/stamps/award",
        expect.objectContaining({
          method: "POST",
        }),
      ),
    );

    const requestInit = fetchSpy.mock.calls[0]?.[1] as { body?: string } | null;
    expect(requestInit?.body).toBeDefined();
    expect(JSON.parse(requestInit!.body!)).toEqual({
      token: "test-token",
      locale: "ja",
    });

    expect(container.querySelector(".animate-spin")).not.toBeNull();

    const awardResult: AwardStampResult = {
      status: "granted",
      message: "Stamp granted!",
      progress: {
        stamps: [],
        remaining: 2,
        surveyCompleted: false,
        rewardEligible: false,
        maintenance: {
          status: "online",
        },
      },
      maintenance: {
        status: "online",
        messageJa: "営業中",
        messageEn: "Online",
        whitelist: [],
        rewardExpiryMinutes: 0,
        fetchedAt: 0,
      },
    };

    const mockResponse = new Response(JSON.stringify(awardResult), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
    fetchDeferred.resolve(mockResponse);

    await waitFor(() =>
      expect(screen.getByTestId("stamp-feedback")).toBeInTheDocument(),
    );

    expect(container.querySelector(".animate-spin")).toBeNull();
    expect(screen.getByText("Stamp granted!")).toBeInTheDocument();
    expect(screen.getByText("collectAllCta-ja")).toBeInTheDocument();
    expect(
      screen.getByText("クリアまで残り 2 箇所です。"),
    ).toBeInTheDocument();

    const viewListButton = screen.getByRole("button", {
      name: "スタンプ一覧を見る",
    });
    expect(viewListButton).toBeInTheDocument();

    fireEvent.click(viewListButton);
    expect(pushMock).toHaveBeenCalledWith("/");
  });
});
