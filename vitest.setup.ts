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
		const mockEntry = {
			target,
			contentRect: {
				x: 0,
				y: 0,
				width: target instanceof HTMLElement ? target.offsetWidth : 0,
				height: target instanceof HTMLElement ? target.offsetHeight : 0,
				top: 0,
				right: target instanceof HTMLElement ? target.offsetWidth : 0,
				bottom: target instanceof HTMLElement ? target.offsetHeight : 0,
				left: 0,
				toJSON() { return this; }
			}
		};
		this.callback([mockEntry], this);
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
