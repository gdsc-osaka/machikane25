import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StampFeedback } from "../stamp-feedback";

describe("StampFeedback", () => {
	it("renders the title, description, and actions", () => {
		render(
			<StampFeedback
				title="テストタイトル"
				description={<span>詳細テキスト</span>}
				actions={<button type="button">アクション</button>}
			/>,
		);

		expect(screen.getByText("テストタイトル")).toBeVisible();
		expect(screen.getByText("詳細テキスト")).toBeVisible();
		expect(screen.getByRole("button", { name: "アクション" })).toBeVisible();
	});

	it("applies success styling when variant=success", () => {
		const { container } = render(
			<StampFeedback title="Success" variant="success" />,
		);

		expect(container.firstElementChild).toHaveClass("border-green-500");
		expect(container.firstElementChild).toHaveClass("bg-green-50");
	});

	it("falls back to info styling by default", () => {
		const { container } = render(<StampFeedback title="Default" />);

		expect(container.firstElementChild).toHaveClass("border-blue-500");
		expect(container.firstElementChild).toHaveClass("bg-blue-50");
	});
});
