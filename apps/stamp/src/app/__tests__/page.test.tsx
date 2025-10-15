import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import Home from "../page";

vi.mock("swr", () => ({
	__esModule: true,
	default: vi.fn(() => ({
		data: null,
		error: null,
		isLoading: false,
	})),
}));

test("HomePage", () => {
	render(<Home />);
	expect(
		screen.getByRole("heading", { level: 1, name: "Stamp" }),
	).toBeDefined();
});
