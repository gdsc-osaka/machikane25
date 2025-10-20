import "@testing-library/jest-dom";

class ResizeObserverStub implements ResizeObserver {
	callback: ResizeObserverCallback;
	constructor(callback: ResizeObserverCallback) {
		this.callback = callback;
	}

	disconnect(): void {
		// noop
	}

	observe(target: Element, options?: ResizeObserverOptions | undefined): void {
		this.callback([], this);
	}

	unobserve(target: Element): void {
		// noop
	}

	takeRecords(): Array<ResizeObserverEntry> {
		return [];
	}
}

if (typeof globalThis.ResizeObserver === "undefined") {
	Object.defineProperty(globalThis, "ResizeObserver", {
		configurable: true,
		writable: true,
		value: ResizeObserverStub,
	});
}
