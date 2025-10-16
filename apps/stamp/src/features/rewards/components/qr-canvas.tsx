"use client";

import { useEffect, useMemo, useRef } from "react";

const VERSION_1_SIZE = 21;
const DATA_CODEWORDS = 19;
const ERROR_CORRECTION_CODEWORDS = 7;
const GENERATOR_POLY = Uint8Array.from([87, 229, 146, 149, 238, 102, 21]);

const createGaloisField = () => {
	const exp = new Uint8Array(512);
	const log = new Uint8Array(256);
	let x = 1;
	for (let i = 0; i < 255; i += 1) {
		exp[i] = x;
		log[x] = i;
		x <<= 1;
		if (x & 0x100) {
			x ^= 0x11d;
		}
	}
	for (let i = 255; i < 512; i += 1) {
		exp[i] = exp[i - 255];
	}

	const multiply = (a: number, b: number) => {
		if (a === 0 || b === 0) {
			return 0;
		}
		return exp[log[a] + log[b]];
	};

	return { multiply };
};

const GF = createGaloisField();

const toUtf8Bytes = (value: string): Uint8Array => {
	return new TextEncoder().encode(value);
};

const buildDataCodewords = (payload: string): Uint8Array => {
	const bytes = toUtf8Bytes(payload);
	if (bytes.length > 17) {
		throw new Error("QR payload too long for version 1-L");
	}

	const bits: number[] = [];
	const pushBits = (value: number, length: number) => {
		for (let i = length - 1; i >= 0; i -= 1) {
			bits.push((value >> i) & 1);
		}
	};

	pushBits(0b0100, 4); // byte mode
	pushBits(bytes.length, 8);
	for (const byte of bytes) {
		pushBits(byte, 8);
	}

	const maxBits = DATA_CODEWORDS * 8;
	const remaining = maxBits - bits.length;
	const terminator = Math.min(4, Math.max(0, remaining));
	for (let i = 0; i < terminator; i += 1) {
		bits.push(0);
	}
	while (bits.length % 8 !== 0) {
		bits.push(0);
	}

	const codewords: number[] = [];
	for (let i = 0; i < bits.length; i += 8) {
		let value = 0;
		for (let j = 0; j < 8; j += 1) {
			value = (value << 1) | bits[i + j]!;
		}
		codewords.push(value);
	}

	const pad = [0xec, 0x11];
	let padIndex = 0;
	while (codewords.length < DATA_CODEWORDS) {
		codewords.push(pad[padIndex % pad.length]);
		padIndex += 1;
	}

	return Uint8Array.from(codewords);
};

const computeErrorCorrection = (data: Uint8Array): Uint8Array => {
	const message = new Uint8Array(DATA_CODEWORDS + ERROR_CORRECTION_CODEWORDS);
	message.set(data);

	for (let i = 0; i < DATA_CODEWORDS; i += 1) {
		const factor = message[i]!;
		if (factor === 0) {
			continue;
		}
		for (let j = 0; j < ERROR_CORRECTION_CODEWORDS; j += 1) {
			const index = i + j + 1;
			message[index] =
				message[index]! ^ GF.multiply(factor, GENERATOR_POLY[j]!);
		}
	}

	return message.slice(DATA_CODEWORDS);
};

type Module = 0 | 1;

type Matrix = Module[][];

const createMatrix = (): {
	values: Array<Array<Module | null>>;
	reserved: boolean[][];
} => {
	const values = Array.from({ length: VERSION_1_SIZE }, () =>
		Array.from({ length: VERSION_1_SIZE }, () => null as Module | null),
	);
	const reserved = Array.from({ length: VERSION_1_SIZE }, () =>
		Array.from({ length: VERSION_1_SIZE }, () => false),
	);
	return { values, reserved };
};

const setModule = (
	target: ReturnType<typeof createMatrix>,
	x: number,
	y: number,
	value: Module,
	reserve = true,
) => {
	if (x < 0 || y < 0 || x >= VERSION_1_SIZE || y >= VERSION_1_SIZE) {
		return;
	}
	target.values[y]![x] = value;
	if (reserve) {
		target.reserved[y]![x] = true;
	}
};

const placeFinderPattern = (
	target: ReturnType<typeof createMatrix>,
	offsetX: number,
	offsetY: number,
) => {
	const pattern: Module[][] = [
		[1, 1, 1, 1, 1, 1, 1],
		[1, 0, 0, 0, 0, 0, 1],
		[1, 0, 1, 1, 1, 0, 1],
		[1, 0, 1, 1, 1, 0, 1],
		[1, 0, 1, 1, 1, 0, 1],
		[1, 0, 0, 0, 0, 0, 1],
		[1, 1, 1, 1, 1, 1, 1],
	];

	for (let dy = 0; dy < 7; dy += 1) {
		for (let dx = 0; dx < 7; dx += 1) {
			setModule(target, offsetX + dx, offsetY + dy, pattern[dy]![dx]!);
		}
	}

	for (let dy = -1; dy <= 7; dy += 1) {
		for (let dx = -1; dx <= 7; dx += 1) {
			if (dx >= 0 && dx < 7 && dy >= 0 && dy < 7) {
				continue;
			}
			setModule(target, offsetX + dx, offsetY + dy, 0, true);
		}
	}
};

const placeTimingPatterns = (target: ReturnType<typeof createMatrix>) => {
	for (let i = 0; i < VERSION_1_SIZE; i += 1) {
		const value: Module = (i % 2 === 0 ? 1 : 0) as Module;
		if (!target.reserved[6]![i]) {
			setModule(target, i, 6, value);
		}
		if (!target.reserved[i]![6]) {
			setModule(target, 6, i, value);
		}
	}
};

const placeDarkModule = (target: ReturnType<typeof createMatrix>) => {
	setModule(target, 8, VERSION_1_SIZE - 8, 1);
};

const placeFormatInformation = (target: ReturnType<typeof createMatrix>) => {
	const formatBits = 0b111011111000100;
	const topLeftCoords: Array<[number, number]> = [
		[8, 0],
		[8, 1],
		[8, 2],
		[8, 3],
		[8, 4],
		[8, 5],
		[8, 7],
		[8, 8],
		[7, 8],
		[5, 8],
		[4, 8],
		[3, 8],
		[2, 8],
		[1, 8],
		[0, 8],
	];

	const mirrorCoords: Array<[number, number]> = [
		[8, VERSION_1_SIZE - 1],
		[8, VERSION_1_SIZE - 2],
		[8, VERSION_1_SIZE - 3],
		[8, VERSION_1_SIZE - 4],
		[8, VERSION_1_SIZE - 5],
		[8, VERSION_1_SIZE - 6],
		[8, VERSION_1_SIZE - 7],
		[VERSION_1_SIZE - 8, 8],
		[VERSION_1_SIZE - 7, 8],
		[VERSION_1_SIZE - 6, 8],
		[VERSION_1_SIZE - 5, 8],
		[VERSION_1_SIZE - 4, 8],
		[VERSION_1_SIZE - 3, 8],
		[VERSION_1_SIZE - 2, 8],
		[VERSION_1_SIZE - 1, 8],
	];

	for (let i = 0; i < 15; i += 1) {
		const bit = ((formatBits >> (14 - i)) & 1) as Module;
		const [xA, yA] = topLeftCoords[i]!;
		setModule(target, xA, yA, bit);
		const [xB, yB] = mirrorCoords[i]!;
		setModule(target, xB, yB, bit);
	}
};

const embedData = (
	target: ReturnType<typeof createMatrix>,
	codewords: Uint8Array,
) => {
	let row = VERSION_1_SIZE - 1;
	let column = VERSION_1_SIZE - 1;
	let byteIndex = 0;
	let bitIndex = 7;
	let direction = -1;

	const takeBit = () => {
		if (byteIndex >= codewords.length) {
			return 0;
		}
		const bit = (codewords[byteIndex]! >> bitIndex) & 1;
		bitIndex -= 1;
		if (bitIndex < 0) {
			byteIndex += 1;
			bitIndex = 7;
		}
		return bit as Module;
	};

	while (column > 0) {
		if (column === 6) {
			column -= 1;
		}

		while (row >= 0 && row < VERSION_1_SIZE) {
			for (let offset = 0; offset < 2; offset += 1) {
				const x = column - offset;
				const y = row;
				if (target.reserved[y]![x]) {
					continue;
				}
				target.values[y]![x] = takeBit();
			}
			row += direction;
		}

		row = row < 0 ? 0 : VERSION_1_SIZE - 1;
		direction *= -1;
		column -= 2;
	}
};

const applyMask = (target: ReturnType<typeof createMatrix>) => {
	for (let y = 0; y < VERSION_1_SIZE; y += 1) {
		for (let x = 0; x < VERSION_1_SIZE; x += 1) {
			if (target.reserved[y]![x]) {
				continue;
			}
			const isMasked = (x + y) % 2 === 0;
			const current = target.values[y]![x] ?? 0;
			target.values[y]![x] = (isMasked ? current ^ 1 : current) as Module;
		}
	}
};

export const generateQrMatrix = (payload: string): Matrix => {
	const dataCodewords = buildDataCodewords(payload);
	const errorCorrection = computeErrorCorrection(dataCodewords);
	const combined = new Uint8Array(
		dataCodewords.length + errorCorrection.length,
	);
	combined.set(dataCodewords);
	combined.set(errorCorrection, dataCodewords.length);

	const matrix = createMatrix();
	placeFinderPattern(matrix, 0, 0);
	placeFinderPattern(matrix, VERSION_1_SIZE - 7, 0);
	placeFinderPattern(matrix, 0, VERSION_1_SIZE - 7);
	placeTimingPatterns(matrix);
	placeDarkModule(matrix);
	placeFormatInformation(matrix);
	embedData(matrix, combined);
	applyMask(matrix);

	return matrix.values.map((row) => row.map((cell) => (cell ?? 0) as Module));
};

export type QrCanvasProps = {
	payload: string;
	size?: number;
	className?: string;
};

export const QrCanvas = ({ payload, size = 240, className }: QrCanvasProps) => {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);

	const matrix = useMemo(() => {
		try {
			return generateQrMatrix(payload);
		} catch (error) {
			console.warn("Failed to generate QR matrix", error);
			return null;
		}
	}, [payload]);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas || !matrix) {
			return;
		}
		const context = canvas.getContext("2d");
		if (!context) {
			return;
		}

		const moduleSize = Math.floor(size / VERSION_1_SIZE);
		const renderSize = moduleSize * VERSION_1_SIZE;
		canvas.width = renderSize;
		canvas.height = renderSize;
		context.fillStyle = "#ffffff";
		context.fillRect(0, 0, renderSize, renderSize);
		context.fillStyle = "#000000";

		for (let y = 0; y < VERSION_1_SIZE; y += 1) {
			for (let x = 0; x < VERSION_1_SIZE; x += 1) {
				if (matrix[y]![x]) {
					context.fillRect(
						x * moduleSize,
						y * moduleSize,
						moduleSize,
						moduleSize,
					);
				}
			}
		}
	}, [matrix, size]);

	if (!matrix) {
		return (
			<div role="alert" className={className}>
				QR payload unavailable.
			</div>
		);
	}

	return (
		<canvas ref={canvasRef} className={className} aria-label="Reward QR code" />
	);
};
