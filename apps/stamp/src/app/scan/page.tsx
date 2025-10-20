"use client";

import jsQR from "jsqr";
import {
	useCallback,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
} from "react";
import {
	requireStaff,
	type StaffAccess,
} from "@/application/auth/require-staff";
import { redeemReward } from "@/application/rewards/redeem-reward.client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
	RewardAlreadyRedeemedError,
	RewardLedgerError,
	RewardNotFoundError,
	RewardRepositoryError,
} from "@/domain/reward";
import { getLogger } from "@/packages/logger";
import {
	RedemptionDialog,
	type RedemptionDialogState,
} from "./components/redemption-dialog";

type AuthorizedStaff = Extract<StaffAccess, { status: "authorized" }>;

type StaffGateState =
	| { status: "loading" }
	| { status: "needs-auth" }
	| { status: "authorized"; staff: AuthorizedStaff["staff"] }
	| { status: "error"; error: Error };

type ScanMode = "scanner" | "manual";

const isBase64Url = (value: string) => /^[A-Za-z0-9_-]+$/u.test(value);

const logger = getLogger();

const normalizeBase64Url = (payload: string) => {
	const normalized = payload.replace(/-/gu, "+").replace(/_/gu, "/");
	const padding = normalized.length % 4;
	if (padding === 0) {
		return normalized;
	}
	return normalized.padEnd(normalized.length + (4 - padding), "=");
};

const decodePayload = (payload: string): { attendeeId: string } | null => {
	try {
		if (!isBase64Url(payload)) {
			return null;
		}
		const normalized = normalizeBase64Url(payload);
		const decoded =
			typeof atob === "function"
				? atob(normalized)
				: Buffer.from(normalized, "base64").toString("utf-8");
		const data = JSON.parse(decoded) as {
			id?: unknown;
			issuedAt?: unknown;
		};
		if (typeof data !== "object" || data === null) {
			return null;
		}
		if (typeof data.id !== "string" || data.id.trim().length === 0) {
			return null;
		}
		return { attendeeId: data.id };
	} catch {
		return null;
	}
};

const formatRedeemedAt = (millis: number | null | undefined) => {
	if (typeof millis !== "number") {
		return new Date().toISOString();
	}
	return new Date(millis).toISOString();
};

const ScanPage = () => {
	const [gateState, setGateState] = useState<StaffGateState>({
		status: "loading",
	});
	const [mode, setMode] = useState<ScanMode>("scanner");
	const [manualInput, setManualInput] = useState("");
	const [dialogState, setDialogState] = useState<RedemptionDialogState | null>(
		null,
	);

	const videoRef = useRef<HTMLVideoElement | null>(null);
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const streamRef = useRef<MediaStream | null>(null);
	const animationFrameRef = useRef<number | null>(null);
	const scanningDisabledRef = useRef(false);

	const stopCamera = useCallback(() => {
		if (animationFrameRef.current !== null) {
			cancelAnimationFrame(animationFrameRef.current);
			animationFrameRef.current = null;
		}
		if (streamRef.current) {
			streamRef.current.getTracks().map((track) => track.stop());
			streamRef.current = null;
		}
	}, []);

	useEffect(() => {
		let cancelled = false;
		const resolveAccess = async () => {
			try {
				const access = await requireStaff();
				if (cancelled) {
					return;
				}
				if (access.status === "needs-auth") {
					setGateState({ status: "needs-auth" });
				} else {
					setGateState({ status: "authorized", staff: access.staff });
				}
			} catch (error) {
				if (!cancelled) {
					setGateState({
						status: "error",
						error:
							error instanceof Error ? error : new Error("Staff guard failed."),
					});
				}
			}
		};
		resolveAccess();
		return () => {
			cancelled = true;
			stopCamera();
		};
	}, [stopCamera]);

	const guard = useMemo(() => gateState, [gateState]);

	const handleDialogClose = useCallback(() => {
		setDialogState(null);
		scanningDisabledRef.current = false;
	}, []);

	const handleSwitchToManual = useCallback(() => {
		stopCamera();
		setMode("manual");
		setDialogState(null);
		scanningDisabledRef.current = false;
	}, [stopCamera]);

	const redeemAttendee = useCallback(async (attendeeId: string) => {
		scanningDisabledRef.current = true;
		try {
			await redeemReward({ attendeeId }).match(
				async (result) => {
					setDialogState({
						status: "redeemable",
						attendeeId: result.attendeeId,
					});
				},
				async (error) => {
					if (RewardAlreadyRedeemedError.isFn(error)) {
						setDialogState({
							status: "duplicate",
							attendeeId: error.extra?.attendeeId ?? attendeeId,
							redeemedAt: formatRedeemedAt(
								(error.extra as { redeemedAt?: number } | undefined)
									?.redeemedAt ?? null,
							),
						});
						return;
					}
					if (
						RewardNotFoundError.isFn(error) ||
						RewardRepositoryError.isFn(error) ||
						RewardLedgerError.isFn(error)
					) {
						setDialogState({
							status: "invalid",
							error: "not-found",
						});
						return;
					}
					setDialogState({
						status: "invalid",
						error: "format",
					});
				},
			);
		} finally {
			setManualInput("");
		}
	}, []);

	const handlePayload = useCallback(
		(payload: string) => {
			if (scanningDisabledRef.current) {
				return;
			}
			const decoded = decodePayload(payload);
			if (decoded === null) {
				setDialogState({
					status: "invalid",
					error: "format",
				});
				scanningDisabledRef.current = true;
				return;
			}
			void redeemAttendee(decoded.attendeeId);
		},
		[redeemAttendee],
	);

	useEffect(() => {
		if (guard.status !== "authorized" || mode !== "scanner") {
			stopCamera();
			return;
		}
		let cancelled = false;

		const startScanner = async () => {
			if (typeof navigator === "undefined" || !navigator.mediaDevices) {
				return;
			}
			try {
				const stream = await navigator.mediaDevices.getUserMedia({
					video: { facingMode: { ideal: "environment" } },
				});
				if (cancelled) {
					stream.getTracks().map((track) => track.stop());
					return;
				}
				streamRef.current = stream;
				const video = videoRef.current;
				if (!video) {
					return;
				}
				video.srcObject = stream;
				await video.play();
				const canvas = canvasRef.current;
				if (!canvas) {
					return;
				}
				const context = canvas.getContext("2d", { willReadFrequently: true });
				if (!context) {
					return;
				}
				const scanFrame = () => {
					if (cancelled || scanningDisabledRef.current) {
						animationFrameRef.current = requestAnimationFrame(scanFrame);
						return;
					}
					if (video.videoWidth === 0 || video.videoHeight === 0) {
						animationFrameRef.current = requestAnimationFrame(scanFrame);
						return;
					}
					canvas.width = video.videoWidth;
					canvas.height = video.videoHeight;
					context.drawImage(video, 0, 0, canvas.width, canvas.height);
					const imageData = context.getImageData(
						0,
						0,
						canvas.width,
						canvas.height,
					);
					const result = jsQR(
						imageData.data,
						imageData.width,
						imageData.height,
					);
					if (result?.data) {
						handlePayload(result.data);
					}
					animationFrameRef.current = requestAnimationFrame(scanFrame);
				};
				scanningDisabledRef.current = false;
				animationFrameRef.current = requestAnimationFrame(scanFrame);
			} catch (error) {
				setDialogState({
					status: "invalid",
					error: "not-found",
				});
				logger.error("Unable to start camera stream.", error);
			}
		};

		void startScanner();

		return () => {
			cancelled = true;
			stopCamera();
		};
	}, [guard, mode, handlePayload, stopCamera]);

	const handleManualSubmit = useCallback(
		async (event: React.FormEvent<HTMLFormElement>) => {
			event.preventDefault();
			if (manualInput.trim().length === 0) {
				return;
			}
			await redeemAttendee(manualInput.trim());
		},
		[manualInput, redeemAttendee],
	);

	const renderGate = () => {
		if (guard.status === "loading") {
			return (
				<main className="bg-background text-foreground mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center gap-4 px-6 py-16">
					<Spinner className="size-6 text-primary" />
					<p className="text-sm text-muted-foreground">
						職員認証の状態を確認しています…
					</p>
				</main>
			);
		}

		if (guard.status === "needs-auth") {
			return (
				<main
					data-testid="staff-login-gate"
					className="bg-background text-foreground mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-6 px-6 py-16"
				>
					<Card className="w-full border-primary/20 shadow-md">
						<CardHeader className="text-center text-xl font-semibold">
							スタッフアカウントでサインインしてください
						</CardHeader>
						<CardContent className="space-y-3 text-center text-sm">
							<p>
								特設スタッフログインページからメールアドレスとパスワードでサインインします。
							</p>
							<p className="text-muted-foreground text-xs">
								Please sign in with your staff email to access the redemption
								console.
							</p>
						</CardContent>
					</Card>
				</main>
			);
		}

		if (guard.status === "error") {
			throw guard.error;
		}

		return null;
	};

	if (guard.status !== "authorized") {
		return renderGate();
	}

	const isScannerMode = mode === "scanner";

	return (
		<main
			data-testid="staff-scan-console"
			className="bg-background text-foreground mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-6 py-10"
		>
			<header className="flex flex-col gap-1">
				<h1 className="text-3xl font-semibold tracking-tight">
					景品受け渡しコンソール
				</h1>
				<p className="text-muted-foreground text-sm">
					Scan reward QR codes or enter attendee IDs manually to record
					redemptions.
				</p>
			</header>

			<section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
				<Card className="overflow-hidden border-primary/20">
					<CardContent className="flex flex-col gap-4 py-6">
						<div className="relative flex min-h-[320px] flex-col items-center justify-center overflow-hidden rounded-lg border bg-muted/40">
							{isScannerMode ? (
								<>
									<video
										ref={videoRef}
										className="h-full w-full object-cover"
										playsInline
										muted
									/>
									<canvas ref={canvasRef} className="hidden" />
									<div className="absolute inset-x-0 bottom-0 bg-black/50 p-3 text-center text-xs text-white">
										カメラをQRコードに向けてください。明るさが足りない場合は照明を調整してください。
									</div>
								</>
							) : (
								<div className="flex h-64 w-full flex-col items-center justify-center gap-3">
									<p className="text-sm text-muted-foreground">
										入力フォームから来場者IDを入力して景品受け渡しを記録します。
									</p>
								</div>
							)}
						</div>
						<div className="flex flex-wrap items-center justify-between gap-3">
							<div className="text-sm">
								<p className="font-medium">
									Staff:{" "}
									{guard.staff.displayName ??
										guard.staff.email ??
										guard.staff.uid}
								</p>
								<p className="text-muted-foreground text-xs">
									Use the manual entry form if the camera cannot read a QR code.
								</p>
							</div>
							<Button
								variant="outline"
								type="button"
								onClick={() => {
									if (isScannerMode) {
										handleSwitchToManual();
									} else {
										setMode("scanner");
										setDialogState(null);
										scanningDisabledRef.current = false;
									}
								}}
								aria-label={
									isScannerMode ? "手動入力に切り替える" : "カメラに戻る"
								}
							>
								<span className="block">
									{isScannerMode ? "手動入力に切り替える" : "カメラに戻る"}
								</span>
								<span className="block text-xs text-muted-foreground">
									{isScannerMode
										? "Switch to manual entry"
										: "Return to scanner"}
								</span>
							</Button>
						</div>

						{mode === "manual" ? (
							<form
								onSubmit={handleManualSubmit}
								className="flex flex-col gap-3 rounded-lg border border-dashed border-primary/40 p-4"
							>
								<label
									className="text-sm font-medium"
									htmlFor="manual-attendee-id"
								>
									Attendee ID / 来場者ID
								</label>
								<Input
									id="manual-attendee-id"
									value={manualInput}
									onChange={(event) => setManualInput(event.target.value)}
									placeholder="例: attendee-abc123"
								/>
								<Button type="submit" className="self-start">
									Redeem reward / 景品受け渡しを記録する
								</Button>
							</form>
						) : null}
					</CardContent>
				</Card>
			</section>

			{dialogState ? (
				<RedemptionDialog
					state={dialogState}
					onClose={handleDialogClose}
					onManualEntry={
						dialogState.status === "invalid" ? handleSwitchToManual : undefined
					}
				/>
			) : null}
		</main>
	);
};

export default ScanPage;
