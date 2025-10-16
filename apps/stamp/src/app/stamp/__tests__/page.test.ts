import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { translate } from "@/lib/i18n/messages";

const hoisted = vi.hoisted(() => ({
  mockPush: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: hoisted.mockPush }),
  useSearchParams: () => ({ get: () => null }),
}));

vi.mock("next/dist/compiled/react", () => import("react"));
vi.mock("next/dist/compiled/react/jsx-runtime", () => import("react/jsx-runtime"));
vi.mock("next/dist/compiled/react-dom", () => import("react-dom"));

let detectLocale: typeof import("../page").detectLocale;
let remainingCopy: typeof import("../page").remainingCopy;
let resolveFeedback: typeof import("../page").resolveFeedback;
let awardFlow: typeof import("../page").awardFlow;

type AwardFlowResult = Awaited<ReturnType<typeof import("../page").awardFlow>>;

const originalFetch = global.fetch;
let languageSpy: ReturnType<typeof vi.spyOn>;

beforeAll(async () => {
  const module = await import("../page");
  detectLocale = module.detectLocale;
  remainingCopy = module.remainingCopy;
  resolveFeedback = module.resolveFeedback;
  awardFlow = module.awardFlow;
});

beforeEach(() => {
  languageSpy = vi.spyOn(window.navigator, "language", "get").mockReturnValue("ja-JP");
  global.fetch = vi.fn() as typeof fetch;
});

afterEach(() => {
  languageSpy.mockRestore();
  global.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("detectLocale", () => {
  it("returns ja when navigator is undefined", () => {
    const originalNavigator = globalThis.navigator;
    // @ts-expect-error simulate server environment
    delete (globalThis as { navigator?: Navigator }).navigator;
    expect(detectLocale()).toBe("ja");
    Object.defineProperty(globalThis, "navigator", {
      value: originalNavigator,
      configurable: true,
      writable: true,
    });
  });

  it("returns en for English locale", () => {
    languageSpy.mockReturnValue("en-GB");
    expect(detectLocale()).toBe("en");
  });
});

describe("remainingCopy", () => {
  it("returns English message with remaining count", () => {
    expect(remainingCopy("en", 3)).toBe("3 stops remaining to finish the rally.");
  });

  it("returns English completion message", () => {
    expect(remainingCopy("en", 0)).toBe("All stops complete!");
  });

  it("returns Japanese message with remaining count", () => {
    expect(remainingCopy("ja", 2)).toBe("クリアまで残り 2 箇所です。");
  });

  it("returns Japanese completion message", () => {
    expect(remainingCopy("ja", 0)).toBe("全てのスタンプを獲得しました！");
  });
});

const baseResult = {
  message: "stub",
  progress: {
    stamps: [],
    remaining: 1,
    surveyCompleted: false,
    rewardEligible: false,
  },
  maintenance: {
    status: "online" as const,
    messageJa: "",
    messageEn: "",
    whitelist: [],
    rewardExpiryMinutes: 120,
    fetchedAt: Date.now(),
  },
};

describe("resolveFeedback", () => {
  it("returns info feedback while loading", () => {
    const feedback = resolveFeedback({
      state: "loading",
      locale: "en",
      result: null,
      errorMessage: null,
    });

    expect(feedback).toEqual({
      variant: "info",
      title: translate("stampProcessing", "en"),
      descriptionLines: [translate("collectAllCta", "en")],
      showAction: false,
      ctaLabel: "View stamp list",
      showSpinner: true,
    });
  });

  it("returns error feedback with provided message", () => {
    const message = "Custom error";
    const feedback = resolveFeedback({
      state: "error",
      locale: "en",
      result: null,
      errorMessage: message,
    });

    expect(feedback?.variant).toBe("error");
    expect(feedback?.descriptionLines).toEqual([message]);
    expect(feedback?.showAction).toBe(false);
  });

  it("returns success feedback for granted status", () => {
    const feedback = resolveFeedback({
      state: "success",
      locale: "en",
      result: { ...baseResult, status: "granted" as const, message: "Granted" },
      errorMessage: null,
    });

    expect(feedback?.variant).toBe("success");
    expect(feedback?.descriptionLines[1]).toBe("1 stops remaining to finish the rally.");
    expect(feedback?.showAction).toBe(true);
    expect(feedback?.ctaLabel).toBe("View stamp list");
  });

  it("returns warning feedback for duplicate status in Japanese", () => {
    const feedback = resolveFeedback({
      state: "success",
      locale: "ja",
      result: { ...baseResult, status: "duplicate" as const, message: "重複" },
      errorMessage: null,
    });

    expect(feedback?.variant).toBe("warning");
    expect(feedback?.descriptionLines[1]).toBe("クリアまで残り 1 箇所です。");
    expect(feedback?.ctaLabel).toBe("スタンプ一覧を見る");
  });

  it("returns warning feedback for maintenance status", () => {
    const feedback = resolveFeedback({
      state: "success",
      locale: "en",
      result: { ...baseResult, status: "maintenance" as const, message: "Maintenance" },
      errorMessage: null,
    });

    expect(feedback?.variant).toBe("warning");
  });

  it("falls back to error variant for invalid status", () => {
    const feedback = resolveFeedback({
      state: "success",
      locale: "en",
      result: { ...baseResult, status: "invalid" as const, message: "Invalid" },
      errorMessage: null,
    });

    expect(feedback?.variant).toBe("error");
    expect(feedback?.descriptionLines[1]).toBe("1 stops remaining to finish the rally.");
  });

  it("returns null when state is idle with no result", () => {
    expect(resolveFeedback({ state: "idle", locale: "ja", result: null, errorMessage: null })).toBeNull();
  });
});

describe("awardFlow", () => {
  it("short-circuits when token is missing", async () => {
    const outcome = await awardFlow(null, "ja");
    expect(outcome.state).toBe("error");
    expect(outcome.errorMessage).toBe(translate("stampInvalid", "ja"));
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("returns success outcome when response is ok", async () => {
    const payload: AwardFlowResult["result"] = {
      status: "granted",
      message: "Granted",
      progress: baseResult.progress,
      maintenance: baseResult.maintenance,
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => payload,
    });

    const outcome = await awardFlow("token", "en");
    expect(outcome.state).toBe("success");
    expect(outcome.result).toEqual(payload);
  });

  it("returns error outcome when response is not ok", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    });

    const outcome = await awardFlow("token", "en");
    expect(outcome.state).toBe("error");
    expect(outcome.errorMessage).toBe(translate("stampInvalid", "en"));
    consoleSpy.mockRestore();
  });

  it("returns error outcome when fetch throws", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("network"));

    const outcome = await awardFlow("token", "en");
    expect(outcome.state).toBe("error");
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
