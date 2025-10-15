import * as functions from "firebase-functions-test";
import { helloWorld } from "../index";

// Initialize Firebase Functions Test SDK
const testEnv = functions.default();

describe("helloWorld Function", () => {
	afterAll(() => {
		testEnv.cleanup();
	});

	it("should respond with 'Hello from Firebase!'", async () => {
		const mockRequest = {} as any; // Mock request object
		const mockResponse = {
			send: vi.fn(),
		} as any; // Mock response object

		helloWorld(mockRequest, mockResponse);

		expect(mockResponse.send).toHaveBeenCalledWith("Hello from Firebase!");
	});
});
