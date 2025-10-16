import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateQrMatrix, QrCanvas } from "../qr-canvas";

describe("generateQrMatrix", () => {
	it("returns a 21x21 matrix of modules", () => {
		const matrix = generateQrMatrix("hello");
		expect(matrix).toHaveLength(21);
		for (const row of matrix) {
			expect(row).toHaveLength(21);
			for (const value of row) {
				expect([0, 1]).toContain(value);
			}
		}
	});

	it("throws when payload exceeds capacity", () => {
		const longPayload = "a".repeat(64);
		expect(() => generateQrMatrix(longPayload)).toThrow(/payload too long/i);
	});
});

describe("QrCanvas", () => {
	const fillRect = vi.fn();
	const getContextMock = vi.fn();

	beforeEach(() => {
		getContextMock.mockReturnValue({
			fillStyle: "#000000",
			fillRect,
			clearRect: vi.fn(),
			canvas: { width: 0, height: 0 },
		} as unknown as CanvasRenderingContext2D);
		vi.spyOn(
			window.HTMLCanvasElement.prototype,
			"getContext",
		).mockImplementation(getContextMock);
	});

	afterEach(() => {
		vi.restoreAllMocks();
		fillRect.mockReset();
		getContextMock.mockReset();
	});

	it("draws QR modules onto the canvas", () => {
		render(<QrCanvas payload="reward:test" />);

		expect(getContextMock).toHaveBeenCalledWith("2d");
		expect(fillRect).toHaveBeenCalled();
	});

	it("shows fallback message when generation fails", () => {
		const longPayload = "z".repeat(80);
		render(<QrCanvas payload={longPayload} />);
		expect(screen.getByText(/qr payload unavailable/i)).toBeInTheDocument();
	});
});
