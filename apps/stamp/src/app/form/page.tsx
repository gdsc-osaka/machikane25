"use client";

import { signInAnonymously } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldError,
	FieldLabel,
	FieldLegend,
	FieldSet,
} from "@/components/ui/field";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getFirebaseAuth } from "@/lib/firebase/client";
import type { SupportedLocale } from "@/lib/i18n/messages";

type SurveyFormValues = {
	satisfactionPhoto: number;
	satisfactionArt: number;
	satisfactionStamp: number;
	freeText: string;
};

const determineLocale = (): SupportedLocale => {
	if (typeof navigator === "undefined") {
		return "ja";
	}
	return navigator.language.startsWith("en") ? "en" : "ja";
};

const copy = {
	ja: {
		heading: "アンケートにご協力ください",
		intro:
			"最後に簡単なアンケートへの回答をお願いします。送信後、景品引換ページへ移動します。",
		photo: "フォトスポットの満足度",
		art: "インタラクティブ作品の満足度",
		stamp: "スタンプラリー全体の満足度",
		freeText: "ご意見・ご感想",
		placeholder: "お気づきの点があればご記入ください（任意）",
		submit: "回答を送信する",
		ratingLabel: "満足度を選択",
		success: "回答を送信しました。景品ページへ移動します。",
		retry: "送信に失敗しました。通信環境をご確認のうえ再度お試しください。",
		authError: "ユーザーの認証に失敗しました。ページを再読み込みしてください。",
	},
	en: {
		heading: "We'd love your feedback",
		intro:
			"Please take a moment to answer a short survey. After submitting, you'll be redirected to the gift page.",
		photo: "Photo spot satisfaction",
		art: "Interactive art satisfaction",
		stamp: "Stamp rally overall satisfaction",
		freeText: "Additional comments",
		placeholder: "Let us know anything else you'd like to share (optional)",
		submit: "Submit survey",
		ratingLabel: "Select your rating",
		success: "Thank you! Redirecting to the gift page.",
		retry:
			"We couldn't send your survey. Please check your connection and try again.",
		authError:
			"We couldn't confirm your sign-in. Please reload the stamp page and try again.",
	},
};

const ratingOptions = [1, 2, 3, 4, 5];

export default function SurveyFormPage() {
	const router = useRouter();
	const [locale, setLocale] = useState<SupportedLocale>("ja");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const {
		control,
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<SurveyFormValues>({
		defaultValues: {
			satisfactionPhoto: 5,
			satisfactionArt: 5,
			satisfactionStamp: 5,
			freeText: "",
		},
	});

	useEffect(() => {
		setLocale(determineLocale());
	}, []);

	const text = copy[locale];

	const onSubmit = handleSubmit(async (values) => {
		setIsSubmitting(true);
		try {
			const auth = getFirebaseAuth();
			let user = auth.currentUser;
			if (!user) {
				const credential = await signInAnonymously(auth);
				user = credential.user ?? null;
			}
			if (!user) {
				toast.error(text.authError);
				setIsSubmitting(false);
				return;
			}

			const response = await fetch("/api/survey", {
				method: "POST",
				headers: {
					"content-type": "application/json",
					authorization: `Bearer ${user.uid}`,
				},
				body: JSON.stringify(values),
			});

			const payload = await response.json().catch(() => ({}));

			if (!response.ok || payload.status !== "success") {
				toast.error(text.retry);
				setIsSubmitting(false);
				return;
			}

			toast.success(text.success);
			router.push("/gift");
		} catch (error) {
			console.error("Survey submission failed", error);
			toast.error(text.retry);
		} finally {
			setIsSubmitting(false);
		}
	});

	return (
		<main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-10 px-6 py-10">
			<header className="flex flex-col gap-2">
				<h1 className="text-3xl font-semibold tracking-tight">
					{text.heading}
				</h1>
				<p className="text-muted-foreground text-base">{text.intro}</p>
			</header>

			<form onSubmit={onSubmit} className="flex flex-col gap-8">
				<FieldSet>
					<FieldLegend>{text.ratingLabel}</FieldLegend>
					<Field>
						<FieldLabel>{text.photo}</FieldLabel>
						<FieldContent>
							<Controller
								name="satisfactionPhoto"
								control={control}
								rules={{ required: true }}
								render={({ field }) => (
									<Select
										value={String(field.value)}
										onValueChange={(value) =>
											field.onChange(Number.parseInt(value, 10))
										}
									>
										<SelectTrigger>
											<SelectValue placeholder="-" />
										</SelectTrigger>
										<SelectContent>
											{ratingOptions.map((rating) => (
												<SelectItem key={rating} value={String(rating)}>
													{rating}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								)}
							/>
						</FieldContent>
					</Field>

					<Field>
						<FieldLabel>{text.art}</FieldLabel>
						<FieldContent>
							<Controller
								name="satisfactionArt"
								control={control}
								rules={{ required: true }}
								render={({ field }) => (
									<Select
										value={String(field.value)}
										onValueChange={(value) =>
											field.onChange(Number.parseInt(value, 10))
										}
									>
										<SelectTrigger>
											<SelectValue placeholder="-" />
										</SelectTrigger>
										<SelectContent>
											{ratingOptions.map((rating) => (
												<SelectItem key={rating} value={String(rating)}>
													{rating}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								)}
							/>
						</FieldContent>
					</Field>

					<Field>
						<FieldLabel>{text.stamp}</FieldLabel>
						<FieldContent>
							<Controller
								name="satisfactionStamp"
								control={control}
								rules={{ required: true }}
								render={({ field }) => (
									<Select
										value={String(field.value)}
										onValueChange={(value) =>
											field.onChange(Number.parseInt(value, 10))
										}
									>
										<SelectTrigger>
											<SelectValue placeholder="-" />
										</SelectTrigger>
										<SelectContent>
											{ratingOptions.map((rating) => (
												<SelectItem key={rating} value={String(rating)}>
													{rating}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								)}
							/>
						</FieldContent>
					</Field>
				</FieldSet>

				<Field>
					<FieldLabel>{text.freeText}</FieldLabel>
					<FieldDescription>
						{locale === "ja"
							? "任意回答です。スタッフへのメッセージや改善点などがあればご記入ください。"
							: "Optional. Share any comments or suggestions for the team."}
					</FieldDescription>
					<FieldContent>
						<Textarea
							{...register("freeText", { maxLength: 500 })}
							placeholder={text.placeholder}
							rows={5}
						/>
						{errors.freeText ? <FieldError errors={[errors.freeText]} /> : null}
					</FieldContent>
				</Field>

				<div className="flex justify-end">
					<Button type="submit" disabled={isSubmitting}>
						{isSubmitting ? "Sending…" : text.submit}
					</Button>
				</div>
			</form>
		</main>
	);
}
