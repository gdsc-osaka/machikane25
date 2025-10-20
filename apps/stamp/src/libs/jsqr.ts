type JsQrResult = {
	data: string;
};

type JsQrDecoder = (
	data: Uint8ClampedArray,
	width: number,
	height: number,
) => JsQrResult | null;

type JsQrGlobal = {
	jsQR?: JsQrDecoder;
};

let warned = false;
let cachedGlobalDecoder: JsQrDecoder | null = null;

const warnOnce = (message: string) => {
	if (warned) {
		return;
	}
	warned = true;
	if (typeof console !== "undefined") {
		console.warn(message);
	}
};

const resolveGlobalDecoder = (): JsQrDecoder | null => {
	if (cachedGlobalDecoder) {
		return cachedGlobalDecoder;
	}
	if (typeof window !== "undefined") {
		const globalDecoder = (window as JsQrGlobal).jsQR;
		if (typeof globalDecoder === "function") {
			cachedGlobalDecoder = globalDecoder;
			return cachedGlobalDecoder;
		}
	}
	return null;
};

const jsQrShim: JsQrDecoder = (data, width, height) => {
	const decoder = resolveGlobalDecoder();
	if (decoder) {
		return decoder(data, width, height);
	}
	warnOnce(
		"jsQR decoder not available. Load the jsQR library or bundle it to enable camera scanning.",
	);
	return null;
};

export type { JsQrDecoder, JsQrResult };
export default jsQrShim;
