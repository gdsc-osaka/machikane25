import { act, render, waitFor } from "@testing-library/react";
import type { MutableRefObject } from "react";
import { useEffect } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useQrScanner } from "../use-qr-scanner";

const jsQrMock = vi.hoisted(() => vi.fn());

vi.mock("jsqr", () => ({
	default: jsQrMock,
}));

type ResumeRef = MutableRefObject<(() => void) | null>;

const createResumeRef = (): ResumeRef => ({
	current: null,
});

const HookHarness = ({
	enabled,
	onScan,
	onError,
	resumeRef,
}: {
	enabled: boolean;
	onScan: (payload: string) => void;
	onError?: (error: Error) => void;
	resumeRef: ResumeRef;
}) => {
	const { videoRef, canvasRef, resume } = useQrScanner({
		enabled,
		onScan,
		onError,
	});

	useEffect(() => {
		resumeRef.current = resume;
	}, [resume, resumeRef]);

	useEffect(() => {
		if (videoRef.current) {
			Object.defineProperty(videoRef.current, "srcObject", {
				configurable: true,
				writable: true,
				value: null,
			});
			Object.defineProperty(videoRef.current, "videoWidth", {
				configurable: true,
				writable: true,
				value: 640,
			});
			Object.defineProperty(videoRef.current, "videoHeight", {
				configurable: true,
				writable: true,
				value: 480,
			});
		}
	}, [videoRef]);

	return (
		<>
			<video ref={videoRef} muted />
			<canvas ref={canvasRef} />
		</>
	);
};

describe("useQrScanner", () => {
	const rafQueue: Array<FrameRequestCallback> = [];

	beforeEach(() => {
		jsQrMock.mockReset();
		jsQrMock.mockReturnValue({ data: "scanned-payload" });

		rafQueue.splice(0, rafQueue.length);
		const requestAnimationFrameMock = vi.fn<typeof requestAnimationFrame>(
			(callback) => {
				rafQueue.push(callback);
				return rafQueue.length;
			},
		);
		const cancelAnimationFrameMock = vi.fn<typeof cancelAnimationFrame>(
			(id) => {
				const index = id - 1;
				if (index >= 0 && index < rafQueue.length) {
					rafQueue[index] = () => {};
				}
			},
		);
		Object.defineProperty(globalThis, "requestAnimationFrame", {
			configurable: true,
			writable: true,
			value: requestAnimationFrameMock,
		});
		Object.defineProperty(globalThis, "cancelAnimationFrame", {
			configurable: true,
			writable: true,
			value: cancelAnimationFrameMock,
		});

		Object.defineProperty(global.HTMLCanvasElement.prototype, "getContext", {
			configurable: true,
			value: vi.fn(() => ({
				drawImage: vi.fn(),
				getImageData: vi.fn(() => ({
					data: new Uint8ClampedArray(4),
					width: 2,
					height: 2,
				})),
			})),
		});

		Object.defineProperty(global.HTMLMediaElement.prototype, "play", {
			configurable: true,
			value: vi.fn().mockResolvedValue(undefined),
		});

		Object.defineProperty(global.navigator, "mediaDevices", {
			configurable: true,
			value: {
				getUserMedia: vi.fn().mockResolvedValue({
					getTracks: () => [
						{
							stop: vi.fn(),
						},
					],
				}),
			},
		});
	});

	it("captures frames and forwards decoded payloads", async () => {
		const onScan = vi.fn();
		const resumeRef = createResumeRef();

		render(<HookHarness enabled onScan={onScan} resumeRef={resumeRef} />);

		await waitFor(() => {
			expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(1);
		});

		await act(async () => {
			rafQueue.shift()?.(0);
		});
		expect(onScan).toHaveBeenCalledTimes(1);
		expect(onScan).toHaveBeenCalledWith("scanned-payload");

		await act(async () => {
			rafQueue.shift()?.(0);
		});
		expect(onScan).toHaveBeenCalledTimes(1);

		act(() => {
			resumeRef.current?.();
		});
		await act(async () => {
			rafQueue.shift()?.(0);
		});
		expect(onScan).toHaveBeenCalledTimes(2);
	});

	it("reports camera errors to the caller", async () => {
		const onError = vi.fn();
		const resumeRef = createResumeRef();
		const cameraError = new Error("permission denied");

		Object.defineProperty(global.navigator, "mediaDevices", {
			configurable: true,
			value: {
				getUserMedia: vi.fn().mockRejectedValue(cameraError),
			},
		});

		render(
			<HookHarness
				enabled
				onScan={vi.fn()}
				onError={onError}
				resumeRef={resumeRef}
			/>,
		);

		await waitFor(() => {
			expect(onError).toHaveBeenCalledTimes(1);
		});
		expect(onError.mock.calls[0]?.[0]).toBe(cameraError);
	});
});
