import jsQR from "jsqr";
import type { RefObject } from "react";
import { useCallback, useEffect, useRef } from "react";

type UseQrScannerArgs = {
	enabled: boolean;
	onScan: (payload: string) => void;
	onError?: (error: Error) => void;
};

type UseQrScannerResult = {
	videoRef: RefObject<HTMLVideoElement | null>;
	canvasRef: RefObject<HTMLCanvasElement | null>;
	stop: () => void;
	resume: () => void;
};

const toError = (value: unknown) =>
	value instanceof Error ? value : new Error("Camera access failed.");

const useQrScanner = ({
	enabled,
	onScan,
	onError,
}: UseQrScannerArgs): UseQrScannerResult => {
	const videoRef = useRef<HTMLVideoElement | null>(null);
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const streamRef = useRef<MediaStream | null>(null);
	const animationFrameRef = useRef<number | null>(null);
	const scanningDisabledRef = useRef(false);

	const stop = useCallback(() => {
		if (animationFrameRef.current !== null) {
			cancelAnimationFrame(animationFrameRef.current);
			animationFrameRef.current = null;
		}
		if (streamRef.current) {
			streamRef.current.getTracks().map((track) => track.stop());
			streamRef.current = null;
		}
	}, []);

	const resume = useCallback(() => {
		scanningDisabledRef.current = false;
	}, []);

	useEffect(() => {
		if (!enabled) {
			stop();
			return;
		}
		let cancelled = false;

		const start = async () => {
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
				scanningDisabledRef.current = false;
				const scanFrame = () => {
					if (cancelled) {
						return;
					}
					if (scanningDisabledRef.current) {
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
						scanningDisabledRef.current = true;
						onScan(result.data);
					}
					animationFrameRef.current = requestAnimationFrame(scanFrame);
				};

				animationFrameRef.current = requestAnimationFrame(scanFrame);
			} catch (error) {
				stop();
				onError?.(toError(error));
			}
		};

		void start();

		return () => {
			cancelled = true;
			stop();
		};
	}, [enabled, onScan, onError, stop]);

	return {
		videoRef,
		canvasRef,
		stop,
		resume,
	};
};

export { useQrScanner };
