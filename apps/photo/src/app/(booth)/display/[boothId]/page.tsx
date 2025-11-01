"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import Webcam from "react-webcam";
import { completeCapture } from "@/app/actions/boothActions";
import { uploadCapturedPhoto } from "@/app/actions/photoActions";
import { Progress } from "@/components/ui/progress";
import { useBoothState } from "@/hooks/useBoothState";

const ensureBoothId = (value: unknown): string =>
	typeof value === "string" ? value : "";

const getBoothState = (state: string | undefined): string =>
	typeof state === "string" ? state : "idle";

export default function DisplayPage() {
	const params = useParams();
	const boothId = ensureBoothId((params as Record<string, unknown>)?.boothId);
	const { booth, latestGeneratedPhotoUrl, isLoading } = useBoothState(boothId);

	const webcamRef = useRef<Webcam>(null);
	const [countdown, setCountdown] = useState<number | null>(null);
	const [isCapturing, setIsCapturing] = useState(false);

	const boothState = useMemo(() => getBoothState(booth?.state), [booth?.state]);

	// カウントダウンロジック
	useEffect(() => {
		if (boothState === "capturing" && !isCapturing) {
			setIsCapturing(true);
			setCountdown(5);
		} else if (boothState !== "capturing") {
			setIsCapturing(false);
			setCountdown(null);
		}
	}, [boothState, isCapturing]);

	// カウントダウンタイマー
	useEffect(() => {
		if (countdown === null || countdown < 0) return;

		if (countdown === 0) {
			// カウントダウン完了、写真撮影
			const capturePhoto = async () => {
				try {
					const screenshot = webcamRef.current?.getScreenshot();
					if (!screenshot) {
						console.error("Failed to capture screenshot");
						return;
					}

					// base64をBlobに変換
					const base64Data = screenshot.split(",")[1];
					const byteCharacters = atob(base64Data);
					const byteNumbers = new Array(byteCharacters.length);
					for (let i = 0; i < byteCharacters.length; i++) {
						byteNumbers[i] = byteCharacters.charCodeAt(i);
					}
					const byteArray = new Uint8Array(byteNumbers);
					const blob = new Blob([byteArray], { type: "image/png" });
					const file = new File([blob], "captured-photo.png", {
						type: "image/png",
					});

					// 写真をアップロード
					await uploadCapturedPhoto({ boothId, file });

					// menu状態に戻す
					await completeCapture({ boothId });

					setCountdown(null);
					setIsCapturing(false);
				} catch (error) {
					console.error("Error capturing photo:", error);
					setCountdown(null);
					setIsCapturing(false);
				}
			};

			void capturePhoto();
			return;
		}

		const timer = setTimeout(() => {
			setCountdown(countdown - 1);
		}, 1000);

		return () => clearTimeout(timer);
	}, [countdown, boothId]);

	const renderIdle = () => (
		<div className="flex h-full w-full flex-col items-center justify-center gap-12 bg-[#303030] px-8">
			<h1 className="bg-gradient-to-r from-[#4796E3] via-[#9177C7] to-[#CA6673] bg-clip-text text-center text-6xl font-bold leading-tight text-transparent drop-shadow-lg md:text-7xl">
				Gemini AI
				<br />
				フォトブース
			</h1>
			<p className="animate-pulse text-center text-3xl font-semibold text-[#e3e3e3] drop-shadow-md md:text-4xl">
				タブレットの画面を
				<br />
				タップしてスタート
			</p>
		</div>
	);

	const renderMenu = () => (
		<div className="flex h-full w-full flex-col items-center justify-center gap-8 bg-[#303030] px-8">
			<p className="whitespace-pre-line text-center text-4xl font-semibold leading-relaxed text-[#e3e3e3] md:text-5xl">
				{`タブレットを操作してください

1. 画像を選ぶ
2. 写真を撮る
3. 決定`}
			</p>
		</div>
	);

	const renderCapturing = () => (
		<div className="relative flex h-full w-full items-center justify-center bg-[#303030]">
			<div className="relative h-full w-full">
				<Webcam
					ref={webcamRef}
					audio={false}
					screenshotFormat="image/png"
					videoConstraints={{
						width: 1080,
						height: 1920,
						facingMode: "user",
					}}
					className="h-full w-full object-cover"
				/>
				<AnimatePresence>
					{countdown !== null && countdown > 0 && (
						<motion.div
							key={countdown}
							initial={{ opacity: 0, scale: 0.5 }}
							animate={{ opacity: 1, scale: 1 }}
							exit={{ opacity: 0, scale: 1.5 }}
							transition={{ duration: 0.3 }}
							className="absolute inset-0 flex items-center justify-center bg-[#303030]/30"
						>
							<span className="bg-gradient-to-r from-[#4796E3] via-[#9177C7] to-[#CA6673] bg-clip-text text-[200px] font-bold text-transparent drop-shadow-2xl md:text-[300px]">
								{countdown}
							</span>
						</motion.div>
					)}
				</AnimatePresence>
			</div>
		</div>
	);

	const renderGenerating = () => (
		<div className="flex h-full w-full flex-col items-center justify-center gap-8 bg-[#303030] px-8">
			<p className="bg-gradient-to-r from-[#4796E3] via-[#9177C7] to-[#CA6673] bg-clip-text text-center text-5xl font-semibold text-transparent drop-shadow-lg md:text-6xl">
				画像を生成中...
			</p>
			<Progress value={undefined} className="w-3/4 max-w-2xl bg-[#444746]" />
		</div>
	);

	const renderCompleted = () => {
		if (!latestGeneratedPhotoUrl) {
			return (
				<div className="flex h-full w-full items-center justify-center bg-[#303030]">
					<p className="text-xl text-[#e3e3e3]">画像を読み込んでいます...</p>
				</div>
			);
		}

		return (
			<div className="flex h-full w-full items-center justify-center bg-[#303030]">
				<Image
					src={latestGeneratedPhotoUrl}
					alt="生成された写真"
					fill
					className="object-contain"
					priority
				/>
			</div>
		);
	};

	const renderContent = () => {
		if (isLoading) {
			return (
				<div className="flex h-full w-full items-center justify-center bg-[#303030]">
					<p className="text-xl text-[#e3e3e3]">読み込み中...</p>
				</div>
			);
		}

		switch (boothState) {
			case "idle":
				return renderIdle();
			case "menu":
				return renderMenu();
			case "capturing":
				return renderCapturing();
			case "generating":
				return renderGenerating();
			case "completed":
				return renderCompleted();
			default:
				return renderIdle();
		}
	};

	return (
		<main className="flex h-screen w-full items-center justify-center overflow-hidden">
			{renderContent()}
		</main>
	);
}
