import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "@/app/page";
import NotFoundPage from "@/app/404/page";
import LoginPage from "@/app/(booth)/login/page";

describe("Page Components", () => {
	describe("Home Page", () => {
		it("should render the home page", () => {
			render(<Home />);

			const heading = screen.getByRole("heading", { name: /photo/i });
			expect(heading).toBeInTheDocument();
			expect(heading).toHaveClass("text-5xl", "font-bold", "mb-8");
		});

		it("should have correct layout structure", () => {
			const { container } = render(<Home />);

			const main = container.querySelector("main");
			expect(main).toBeInTheDocument();
			expect(main).toHaveClass(
				"flex",
				"min-h-screen",
				"flex-col",
				"items-center",
				"justify-center",
				"p-24",
			);
		});
	});

	describe("404 Page", () => {
		it("should render the 404 page", () => {
			render(<NotFoundPage />);

			const heading = screen.getByRole("heading", {
				name: /404 - page not found/i,
			});
			expect(heading).toBeInTheDocument();
			expect(heading).toHaveClass("text-5xl", "font-bold", "mb-8");
		});

		it("should have correct layout structure", () => {
			const { container } = render(<NotFoundPage />);

			const main = container.querySelector("main");
			expect(main).toBeInTheDocument();
			expect(main).toHaveClass(
				"flex",
				"min-h-screen",
				"flex-col",
				"items-center",
				"justify-center",
				"p-24",
			);
		});
	});

	describe("Login Page", () => {
		it("should render the login page", () => {
			render(<LoginPage />);

			const heading = screen.getByRole("heading", { name: /login/i });
			expect(heading).toBeInTheDocument();
			expect(heading).toHaveClass("text-5xl", "font-bold", "mb-8");
		});

		it("should have correct layout structure", () => {
			const { container } = render(<LoginPage />);

			const main = container.querySelector("main");
			expect(main).toBeInTheDocument();
			expect(main).toHaveClass(
				"flex",
				"min-h-screen",
				"flex-col",
				"items-center",
				"justify-center",
				"p-24",
			);
		});
	});
});
