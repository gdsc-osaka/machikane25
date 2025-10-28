"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "react-qr-code";
import Webcam from "react-webcam";
import { completeCapture } from "@/app/actions/boothActions";
import { uploadCapturedPhoto } from "@/app/actions/photoActions";
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
		<div className="flex flex-col items-center gap-4">
			<p className="text-2xl font-semibold">タッチパネルをタップしてね</p>
			<p className="text-sm text-muted-foreground">
				スタッフが準備中です。少しお待ちください。
			</p>
		</div>
	);

	const renderMenu = () => {
		const baseurl = process.env.NEXT_PUBLIC_BASE_URL;
		const uploadUrl = `${baseurl}/upload/${boothId}`;
		return (
			<div className="flex flex-col items-center gap-6">
				<p className="text-xl font-semibold">
					スマホでQRコードを読み取って写真をアップロードしてください
				</p>
				<div className="rounded-lg border bg-white p-4 shadow">
					<QRCode value={uploadUrl} />
				</div>
				<p className="text-sm text-muted-foreground">{uploadUrl}</p>
			</div>
		);
	};

	const renderCapturing = () => (
		<div className="relative flex flex-col items-center gap-4">
			<div className="relative overflow-hidden rounded-lg border shadow-lg">
				<Webcam
					ref={webcamRef}
					audio={false}
					screenshotFormat="image/png"
					videoConstraints={{
						width: 1280,
						height: 720,
						facingMode: "user",
					}}
				/>
				<AnimatePresence>
					{countdown !== null && countdown > 0 && (
						<motion.div
							key={countdown}
							initial={{ opacity: 0, scale: 0.5 }}
							animate={{ opacity: 1, scale: 1 }}
							exit={{ opacity: 0, scale: 1.5 }}
							transition={{ duration: 0.3 }}
							className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30"
						>
							<span className="text-[200px] font-bold text-white drop-shadow-lg">
								{countdown}
							</span>
						</motion.div>
					)}
				</AnimatePresence>
			</div>
			<p className="text-2xl font-semibold">撮影中...</p>
			<p className="text-sm text-muted-foreground">
				カウントダウンに合わせてポーズ！
			</p>
		</div>
	);

	const renderGenerating = () => (
		<div className="flex flex-col items-center gap-4">
			<p className="text-2xl font-semibold">AIが写真を生成中...</p>
			<p className="text-sm text-muted-foreground">
				少しお時間をいただいています。完了すると生成結果が表示されます。
			</p>
		</div>
	);

	const renderCompleted = () => {
		if (!latestGeneratedPhotoUrl) {
			return (
				<p className="text-sm text-muted-foreground">
					最新の写真を読み込んでいます…
				</p>
			);
		}

		return (
			<div className="flex flex-col items-center gap-6">
				<img
					src={latestGeneratedPhotoUrl}
					alt="生成した写真"
					className="max-h-[480px] w-auto max-w-full rounded-lg shadow-lg"
				/>
				<p className="text-sm text-muted-foreground">
					スタッフがQRコードを表示するまでお待ちください。
				</p>
			</div>
		);
	};

	const renderContent = () => {
		if (isLoading) {
			return <p className="text-sm text-muted-foreground">読み込み中...</p>;
		}

		if (boothState === "idle") {
			return renderIdle();
		}

		if (boothState === "menu") {
			return renderMenu();
		}

		if (boothState === "capturing") {
			return renderCapturing();
		}

		if (boothState === "generating") {
			return renderGenerating();
		}

		if (boothState === "completed") {
			return renderCompleted();
		}

		return renderIdle();
	};

	return (
		<main className="flex min-h-screen flex-col items-center justify-center gap-8 p-6 md:p-10">
			<header className="text-center">
				<h1 className="text-3xl font-bold">Display</h1>
				<p className="text-sm text-muted-foreground">
					ブースID: {boothId || "未設定"}
				</p>
			</header>
			<section className="w-full max-w-3xl">{renderContent()}</section>
		</main>
	);
}
