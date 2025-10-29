type BlurResult = Readonly<{
	toBuffer: () => Promise<Buffer>;
}>;

type RawResult = Readonly<{
	toBuffer: () => Promise<
		Readonly<{
			data: Buffer;
			info: Readonly<{
				width: number;
				height: number;
				channels: number;
				premultiplied: boolean;
				size: number;
			}>;
		}>
	>;
}>;

type RemoveAlphaResult = Readonly<{
	raw: () => RawResult;
}>;

type ResizeResult = Readonly<{
	removeAlpha: () => RemoveAlphaResult;
}>;

export type Sharp = Readonly<{
	blur: (sigma: number) => BlurResult;
	resize: (
		dimensions: Readonly<{ width: number; height: number; fit: string }>,
	) => ResizeResult;
}>;

type SharpFactory = (buffer: Buffer) => Sharp;

const createSharp: SharpFactory = (buffer) => {
	const blur: Sharp["blur"] = () => ({
		toBuffer: () => Promise.resolve(Buffer.from(buffer)),
	});

	const raw: RawResult = {
		toBuffer: () =>
			Promise.resolve({
				data: Buffer.from(buffer),
				info: {
					width: 1,
					height: 1,
					channels: 3,
					premultiplied: false,
					size: buffer.length,
				},
			}),
	};

	const resize: Sharp["resize"] = () => ({
		removeAlpha: () => ({
			raw: () => raw,
		}),
	});

	return {
		blur,
		resize,
	};
};

export default createSharp;
