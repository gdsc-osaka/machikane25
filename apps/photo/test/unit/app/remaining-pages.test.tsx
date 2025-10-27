import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AdminPage from "@/app/(booth)/admin/page";
import ControlPage from "@/app/(booth)/control/[boothId]/page";
import DisplayPage from "@/app/(booth)/display/[boothId]/page";
import PhotosPage from "@/app/(booth)/photos/page";
import DownloadPage from "@/app/(user)/download/[boothId]/[photoId]/page";
import UploadPage from "@/app/(user)/upload/[boothId]/page";

const hookMocks = vi.hoisted(() => ({
	useBoothState: vi.fn(() => ({
		booth: {
			id: "booth-id",
			state: "idle",
			latestPhotoId: null,
			lastTakePhotoAt: null,
		},
		latestGeneratedPhotoUrl: null,
		isLoading: false,
		error: null,
	})),
	useUploadedPhotos: vi.fn(() => ({
		photos: [],
		isLoading: false,
		error: null,
	})),
	useGenerationOptions: vi.fn(() => ({
		options: {},
		isLoading: false,
		error: null,
	})),
}));

const clientMocks = vi.hoisted(() => ({
	ensureAnonymousSignIn: vi.fn(() => Promise.resolve()),
	initializeFirebaseClient: vi.fn(),
}));

const generationActionMocks = vi.hoisted(() => ({
	getGeneratedPhotoAction: vi.fn(() =>
		Promise.resolve({
			data: {
				imageUrl: "https://example.com/generated/photo.png",
			},
			error: null,
		}),
	),
}));

vi.mock("@/hooks/useBoothState", () => ({ useBoothState: hookMocks.useBoothState }));

vi.mock("@/hooks/useUploadedPhotos", () => ({
	useUploadedPhotos: hookMocks.useUploadedPhotos,
}));

vi.mock("@/hooks/useGenerationOptions", () => ({
	useGenerationOptions: hookMocks.useGenerationOptions,
}));

vi.mock("@/lib/firebase/client", () => ({
	ensureAnonymousSignIn: clientMocks.ensureAnonymousSignIn,
	initializeFirebaseClient: clientMocks.initializeFirebaseClient,
}));

vi.mock("@/app/actions/generationActions", () => ({
	getGeneratedPhotoAction: generationActionMocks.getGeneratedPhotoAction,
}));

vi.mock("next/navigation", () => ({
	useParams: () => ({ boothId: "booth-id", photoId: "photo-id" }),
	useRouter: () => ({
		push: vi.fn(),
		replace: vi.fn(),
		refresh: vi.fn(),
	}),
}));

vi.mock("react-qr-code", () => ({
	__esModule: true,
	default: () => <div data-testid="qr-code" />,
}));

vi.mock("react-webcam", () => ({
	__esModule: true,
	default: () => <div data-testid="webcam-feed" />,
}));

vi.mock("sonner", () => ({
	toast: {
		success: vi.fn(),
		error: vi.fn(),
	},
}));

const expectHeadingStyles = (heading: HTMLElement) => {
	const className = heading.getAttribute("class") ?? "";
	expect(className).toMatch(/font-(semi)?bold/);
	expect(className).toMatch(/text-(3|4|5)xl/);
};

const expectMainLayout = (main: HTMLElement | null) => {
	expect(main).toBeInTheDocument();
	const className = main?.getAttribute("class") ?? "";
	expect(className).toContain("min-h-screen");
	expect(className).toContain("flex");
	expect(className).toContain("flex-col");

	const hasPadding = className
		.split(/\s+/)
		.some((cls) => /^p[a-z-]*\d/.test(cls) || cls.includes(":p"));
	expect(hasPadding).toBe(true);
};

describe("Remaining Page Components", () => {
	describe("AdminPage", () => {
		it("should render the admin page", () => {
			render(<AdminPage />);

			const heading = screen.getByRole("heading", { name: /admin/i });
			expect(heading).toBeInTheDocument();
			expectHeadingStyles(heading);
		});

		it("should have correct layout structure", () => {
			const { container } = render(<AdminPage />);

			const main = container.querySelector("main");
			expectMainLayout(main);
		});
	});

	describe("ControlPage", () => {
		it("should render the control page", () => {
			render(<ControlPage />);

			const heading = screen.getByRole("heading", { name: /control/i });
			expect(heading).toBeInTheDocument();
			expectHeadingStyles(heading);
		});

		it("should have correct layout structure", () => {
			const { container } = render(<ControlPage />);

			const main = container.querySelector("main");
			expectMainLayout(main);
		});
	});

	describe("DisplayPage", () => {
		it("should render the display page", () => {
			render(<DisplayPage />);

			const heading = screen.getByRole("heading", { name: /display/i });
			expect(heading).toBeInTheDocument();
			expectHeadingStyles(heading);
		});

		it("should have correct layout structure", () => {
			const { container } = render(<DisplayPage />);

			const main = container.querySelector("main");
			expectMainLayout(main);
		});
	});

	describe("PhotosPage", () => {
		it("should render the photos page", () => {
			render(<PhotosPage />);

			const heading = screen.getByRole("heading", { name: /photos/i });
			expect(heading).toBeInTheDocument();
			expectHeadingStyles(heading);
		});

		it("should have correct layout structure", () => {
			const { container } = render(<PhotosPage />);

			const main = container.querySelector("main");
			expectMainLayout(main);
		});
	});

	describe("DownloadPage", () => {
		const mockGetGeneratedPhotoAction = generationActionMocks.getGeneratedPhotoAction;
		const params = { boothId: "booth-id", photoId: "photo-id" };

		beforeEach(() => {
			vi.clearAllMocks();
			mockGetGeneratedPhotoAction.mockResolvedValue({
				data: {
					imageUrl: "https://example.com/generated/photo.png",
				},
				error: null,
			});
		});

		it("should render the download page", async () => {
			const page = await DownloadPage({ params });
			render(page);

			const heading = screen.getByRole("heading", { name: /ai photo/i });
			expect(heading).toBeInTheDocument();
			expectHeadingStyles(heading);
		});

		it("should have correct layout structure", async () => {
			const page = await DownloadPage({ params });
			const { container } = render(page);

			const main = container.querySelector("main");
			expectMainLayout(main);
		});
	});

	describe("UploadPage", () => {
		it("should render the upload page", () => {
			render(<UploadPage />);

			const heading = screen.getByRole("heading", { name: /upload/i });
			expect(heading).toBeInTheDocument();
			expectHeadingStyles(heading);
		});

		it("should have correct layout structure", () => {
			const { container } = render(<UploadPage />);

			const main = container.querySelector("main");
			expectMainLayout(main);
		});
	});
});
