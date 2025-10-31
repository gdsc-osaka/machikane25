import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import BoothLayout from "@/app/(booth)/layout";
import UserLayout from "@/app/(user)/layout";

describe("Layout Components", () => {
	describe("BoothLayout", () => {
		it("should render children without wrapper", () => {
			const { getByTestId } = render(
				<BoothLayout>
					<div data-testid="booth-child">Booth Content</div>
				</BoothLayout>,
			);

			expect(getByTestId("booth-child")).toBeInTheDocument();
			expect(getByTestId("booth-child")).toHaveTextContent("Booth Content");
		});

		it("should render multiple children", () => {
			const { getByText } = render(
				<BoothLayout>
					<div>First Child</div>
					<div>Second Child</div>
				</BoothLayout>,
			);

			expect(getByText("First Child")).toBeInTheDocument();
			expect(getByText("Second Child")).toBeInTheDocument();
		});
	});

	describe("UserLayout", () => {
		it("should render children without wrapper", () => {
			const { getByTestId } = render(
				<UserLayout>
					<div data-testid="user-child">User Content</div>
				</UserLayout>,
			);

			expect(getByTestId("user-child")).toBeInTheDocument();
			expect(getByTestId("user-child")).toHaveTextContent("User Content");
		});

		it("should render multiple children", () => {
			const { getByText } = render(
				<UserLayout>
					<div>First Child</div>
					<div>Second Child</div>
				</UserLayout>,
			);

			expect(getByText("First Child")).toBeInTheDocument();
			expect(getByText("Second Child")).toBeInTheDocument();
		});
	});
});
