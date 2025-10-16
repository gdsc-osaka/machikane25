import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StampFeedback } from "../stamp-feedback";

describe("StampFeedback", () => {
	it("renders the title with the default info styling", () => {
		render(<StampFeedback title="Heads up" />);

		const container = screen.getByRole("status");
		expect(container).toHaveClass("border-blue-500", "bg-blue-50", "text-blue-800");
		expect(screen.getByText("Heads up")).toBeInTheDocument();
	});

	it("supports descriptions, actions and alternate variants", () => {
		render(
			<StampFeedback
				title="Warning"
				description="Please try again"
				actions={<button type="button">Retry</button>}
				variant="warning"
			/>,
		);

		const container = screen.getByRole("status");
		expect(container).toHaveClass(
			"border-yellow-500",
			"bg-yellow-50",
			"text-yellow-800",
		);
		expect(screen.getByText("Please try again")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
	});
});
