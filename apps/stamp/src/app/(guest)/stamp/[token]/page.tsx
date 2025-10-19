"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSWRConfig } from "swr";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
	createStampProgressKey,
} from "@/hooks/use-stamp-progress";
import { useAnonymousAttendee } from "@/hooks/use-anonymous-attendee";
import { createClaimStampService } from "@/application/stamps/claim-stamp";
import {
	getStampMessages,
	type SupportedLocale,
} from "@/application/i18n/messages";
import { getStampCopy } from "@/libs/i18n/stamp-copy";
import { getLogger } from "@/packages/logger";

type ClaimViewState =
	| {
			status: "loading";
	  }
	| {
			status: "success";
			checkpointLabel: string;
		}
	| {
			status: "duplicate";
		}
	| {
			status: "invalid";
		}
	| {
			status: "error";
		};

type StampPageProps = {
	params: {
		token: string;
	};
};

const resolveLocale = (): SupportedLocale => {
	if (typeof navigator === "undefined") {
		return "ja";
	}
	return navigator.language.startsWith("ja") ? "ja" : "en";
};

const successAccent =
	"border-primary bg-primary/10 text-primary";

const warningAccent =
	"border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400";

const errorAccent =
	"border-destructive bg-destructive/10 text-destructive";

export default function StampTokenPage({ params }: StampPageProps) {
	const attendee = useAnonymousAttendee();
	const { mutate } = useSWRConfig();
	const locale = useMemo(resolveLocale, []);
	const messages = useMemo(() => getStampMessages(locale), [locale]);
	const genericError = useMemo(
		() => getStampCopy(locale, ["errors", "generic"]),
		[locale],
	);
	const [state, setState] = useState<ClaimViewState>({ status: "loading" });
	const hasClaimedRef = useRef(false);

	useEffect(() => {
		if (attendee.status === "error") {
			setState({ status: "error" });
			return;
		}
		if (attendee.status !== "ready") {
			return;
		}
		if (hasClaimedRef.current) {
			return;
		}
		hasClaimedRef.current = true;
		const attendeeId = attendee.attendeeId;
		if (attendeeId === null) {
			setState({ status: "error" });
			return;
		}
		const key = createStampProgressKey(attendeeId);
		const service = createClaimStampService();
		const token = decodeURIComponent(params.token);
		setState({ status: "loading" });
		void service
			.claim({ userId: attendeeId, token })
			.then((result) => {
				if (result.isOk()) {
					const payload = result._unsafeUnwrap();
					void mutate(key, undefined, { revalidate: true });
					setState({
						status: "success",
						checkpointLabel: messages.checkpoints[payload.checkpoint],
					});
					return;
				}
				const error = result._unsafeUnwrapErr();
				if (error.code === "duplicate-stamp") {
					setState({ status: "duplicate" });
					return;
				}
				if (error.code === "invalid-token") {
					setState({ status: "invalid" });
					return;
				}
				setState({ status: "error" });
			})
			.catch((error) => {
				getLogger().error(error, "Failed to claim stamp token.");
				setState({ status: "error" });
			});
	}, [attendee.attendeeId, attendee.status, locale, messages.checkpoints, mutate, params.token]);

	const localizedTitle = useMemo(
		() =>
			state.status === "loading"
				? locale === "ja"
					? "スタンプを獲得しています"
					: "Claiming your stamp"
				: state.status === "success"
					? messages.stamp.success.heading
					: state.status === "duplicate"
						? messages.stamp.duplicate.heading
						: state.status === "invalid"
							? messages.stamp.invalid.heading
							: genericError,
		[
			state.status,
			messages.stamp.success.heading,
			messages.stamp.duplicate.heading,
			messages.stamp.invalid.heading,
			genericError,
			locale,
		],
	);

	const localizedBody = useMemo(() => {
		if (state.status === "success") {
			return `${messages.stamp.success.body} (${state.checkpointLabel})`;
		}
		if (state.status === "duplicate") {
			return messages.stamp.duplicate.body;
		}
		if (state.status === "invalid") {
			return messages.stamp.invalid.body;
		}
		if (state.status === "loading") {
			return locale === "ja"
				? "まもなく完了します…"
				: "Hang tight, almost done…";
		}
		return genericError;
	}, [
		state,
		messages.stamp.success.body,
		messages.stamp.duplicate.body,
		messages.stamp.invalid.body,
		genericError,
		locale,
	]);

	const accentClass =
		state.status === "success"
			? successAccent
			: state.status === "duplicate"
				? warningAccent
				: state.status === "invalid"
					? warningAccent
					: state.status === "loading"
						? "border-muted bg-muted/40 text-muted-foreground"
						: errorAccent;

	return (
		<main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center gap-10 px-6 py-16 text-center">
			<section className="flex flex-col items-center gap-6">
				<div
					className={`flex h-48 w-48 items-center justify-center rounded-full border-4 text-3xl font-bold transition-colors ${accentClass}`}
				>
					{state.status === "loading" ? (
						<Spinner className="size-16 text-current" />
					) : state.status === "success" ? (
						"✓"
					) : (
						"!"
					)}
				</div>
				<div className="flex flex-col gap-3">
					<h1 className="text-3xl font-semibold text-foreground sm:text-4xl">
						{localizedTitle}
					</h1>
					<p className="text-base text-muted-foreground sm:text-lg">
						{localizedBody}
					</p>
				</div>
				<Button asChild size="lg" variant="secondary">
					<Link href="/">
						{locale === "ja" ? "スタンプ一覧へ戻る" : "Return to Stamp Board"}
					</Link>
				</Button>
			</section>
		</main>
	);
}
