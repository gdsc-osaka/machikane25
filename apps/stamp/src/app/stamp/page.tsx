"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { StampFeedback } from "@/features/stamps/components/stamp-feedback";
import type { AwardStampResult } from "@/features/stamps/server/award-stamp";
import { type SupportedLocale, translate } from "@/lib/i18n/messages";

export type AwardState = "idle" | "loading" | "success" | "error";

export type FeedbackData = {
  variant: "info" | "warning" | "success" | "error";
  title: string;
  descriptionLines: string[];
  showAction: boolean;
  ctaLabel: string;
  showSpinner: boolean;
};

export const detectLocale = (): SupportedLocale => {
  if (typeof navigator === "undefined") {
    return "ja";
  }
  return navigator.language.startsWith("en") ? "en" : "ja";
};

export const remainingCopy = (locale: SupportedLocale, count: number) => {
  if (locale === "en") {
    return count > 0
      ? `${count} stops remaining to finish the rally.`
      : "All stops complete!";
  }
  return count > 0
    ? `クリアまで残り ${count} 箇所です。`
    : "全てのスタンプを獲得しました！";
};

export type ResolveFeedbackParams = {
  state: AwardState;
  locale: SupportedLocale;
  result: AwardStampResult | null;
  errorMessage: string | null;
};

export const resolveFeedback = ({
  state,
  locale,
  result,
  errorMessage,
}: ResolveFeedbackParams): FeedbackData | null => {
  if (state === "loading") {
    return {
      variant: "info",
      title: translate("stampProcessing", locale),
      descriptionLines: [translate("collectAllCta", locale)],
      showAction: false,
      ctaLabel: locale === "en" ? "View stamp list" : "スタンプ一覧を見る",
      showSpinner: true,
    };
  }

  if (state === "error") {
    const message = errorMessage ?? translate("stampInvalid", locale);
    return {
      variant: "error",
      title: translate("stampInvalid", locale),
      descriptionLines: [message],
      showAction: false,
      ctaLabel: locale === "en" ? "View stamp list" : "スタンプ一覧を見る",
      showSpinner: false,
    };
  }

  if (state === "success" && result) {
    const variant =
      result.status === "granted"
        ? "success"
        : result.status === "duplicate" || result.status === "maintenance"
          ? "warning"
          : "error";

    return {
      variant,
      title: result.message,
      descriptionLines: [
        translate("collectAllCta", locale),
        remainingCopy(locale, result.progress.remaining),
      ],
      showAction: true,
      ctaLabel: locale === "en" ? "View stamp list" : "スタンプ一覧を見る",
      showSpinner: false,
    };
  }

  return null;
};

export type AwardFlowOutcome = {
  state: AwardState;
  result: AwardStampResult | null;
  errorMessage: string | null;
};

export const awardFlow = async (
  token: string | null,
  locale: SupportedLocale,
): Promise<AwardFlowOutcome> => {
  if (!token) {
    return {
      state: "error",
      result: null,
      errorMessage: translate("stampInvalid", locale),
    };
  }

  try {
    const response = await fetch("/api/stamps/award", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ token, locale }),
    });

    if (!response.ok) {
      throw new Error(`award failed: ${response.status}`);
    }

    const payload = (await response.json()) as AwardStampResult;
    return {
      state: "success",
      result: payload,
      errorMessage: null,
    };
  } catch (error) {
    console.error(error);
    return {
      state: "error",
      result: null,
      errorMessage: translate("stampInvalid", locale),
    };
  }
};

const StampPageContent = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [locale, setLocale] = useState<SupportedLocale>("ja");
  const [state, setState] = useState<AwardState>("idle");
  const [result, setResult] = useState<AwardStampResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const token = searchParams.get("token");

  useEffect(() => {
    setLocale(detectLocale());
  }, []);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (token) {
        setState("loading");
        setErrorMessage(null);
      }

      const outcome = await awardFlow(token, locale);
      if (cancelled) {
        return;
      }
      setState(outcome.state);
      setResult(outcome.result);
      setErrorMessage(outcome.errorMessage);
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [token, locale]);

  const feedback = useMemo(
    () =>
      resolveFeedback({
        state,
        locale,
        result,
        errorMessage,
      }),
    [state, locale, result, errorMessage],
  );

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-6 px-6 py-10">
      {feedback ? (
        <StampFeedback
          variant={feedback.variant}
          title={feedback.title}
          description={
            <div className="text-sm">
              {feedback.descriptionLines.map((line, index) => (
                <p key={`${line}-${index}`} className={index ? "mt-2" : undefined}>
                  {line}
                </p>
              ))}
            </div>
          }
          actions={
            feedback.showAction ? (
              <button
                type="button"
                className="rounded-md bg-primary px-4 py-2 text-primary-foreground shadow"
                onClick={() => router.push("/")}
              >
                {feedback.ctaLabel}
              </button>
            ) : null
          }
        />
      ) : null}

      {feedback?.showSpinner ? (
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      ) : null}
    </main>
  );
};

const LoadingFallback = () => (
  <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-6 px-6 py-10">
    <div
      aria-label="Loading stamp status"
      className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"
      role="status"
    />
  </main>
);

export default function StampPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <StampPageContent />
    </Suspense>
  );
}
