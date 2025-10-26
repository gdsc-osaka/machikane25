import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AdminPage from "@/app/(booth)/admin/page";
import ControlPage from "@/app/(booth)/control/[boothId]/page";
import DisplayPage from "@/app/(booth)/display/[boothId]/page";
import PhotosPage from "@/app/(booth)/photos/page";
import DownloadPage from "@/app/(user)/download/[boothId]/[photoId]/page";
import UploadPage from "@/app/(user)/upload/[boothId]/page";

describe("Remaining Page Components", () => {
	describe("AdminPage", () => {
		it("should render the admin page", () => {
			render(<AdminPage />);

			const heading = screen.getByRole("heading", { name: /admin/i });
			expect(heading).toBeInTheDocument();
			expect(heading).toHaveClass("text-5xl", "font-bold", "mb-8");
		});

		it("should have correct layout structure", () => {
			const { container } = render(<AdminPage />);

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

	describe("ControlPage", () => {
		it("should render the control page", () => {
			render(<ControlPage />);

			const heading = screen.getByRole("heading", { name: /control/i });
			expect(heading).toBeInTheDocument();
			expect(heading).toHaveClass("text-5xl", "font-bold", "mb-8");
		});

		it("should have correct layout structure", () => {
			const { container } = render(<ControlPage />);

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

	describe("DisplayPage", () => {
		it("should render the display page", () => {
			render(<DisplayPage />);

			const heading = screen.getByRole("heading", { name: /display/i });
			expect(heading).toBeInTheDocument();
			expect(heading).toHaveClass("text-5xl", "font-bold", "mb-8");
		});

		it("should have correct layout structure", () => {
			const { container } = render(<DisplayPage />);

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

	describe("PhotosPage", () => {
		it("should render the photos page", () => {
			render(<PhotosPage />);

			const heading = screen.getByRole("heading", { name: /photos/i });
			expect(heading).toBeInTheDocument();
			expect(heading).toHaveClass("text-5xl", "font-bold", "mb-8");
		});

		it("should have correct layout structure", () => {
			const { container } = render(<PhotosPage />);

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

	describe("DownloadPage", () => {
		it("should render the download page", () => {
			render(<DownloadPage />);

			const heading = screen.getByRole("heading", { name: /download/i });
			expect(heading).toBeInTheDocument();
			expect(heading).toHaveClass("text-5xl", "font-bold", "mb-8");
		});

		it("should have correct layout structure", () => {
			const { container } = render(<DownloadPage />);

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

	describe("UploadPage", () => {
		it("should render the upload page", () => {
			render(<UploadPage />);

			const heading = screen.getByRole("heading", { name: /upload/i });
			expect(heading).toBeInTheDocument();
			expect(heading).toHaveClass("text-5xl", "font-bold", "mb-8");
		});

		it("should have correct layout structure", () => {
			const { container } = render(<UploadPage />);

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
