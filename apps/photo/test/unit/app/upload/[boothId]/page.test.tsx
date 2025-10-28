/**
 * T304 [P] [US1] RTL Spec (Image Upload Page)
 *
 * Failing expectations for anonymous upload flow validations.
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import UploadPage from "@/app/(user)/upload/[boothId]/page";

const boothId = "upload-test-booth";

const clientMocks = vi.hoisted(() => ({
	ensureAnonymousSignIn: vi.fn(),
	initializeFirebaseClient: vi.fn(),
}));

const photoActionMocks = vi.hoisted(() => ({
	uploadUserPhoto: vi.fn(),
}));

const toastMocks = vi.hoisted(() => ({
	success: vi.fn(),
	error: vi.fn(),
}));

const navigationMocks = vi.hoisted(() => ({
	useParams: vi.fn(),
}));

vi.mock("@/lib/firebase/client", () => ({
	ensureAnonymousSignIn: clientMocks.ensureAnonymousSignIn,
	initializeFirebaseClient: clientMocks.initializeFirebaseClient,
}));

vi.mock("@/app/actions/photoActions", () => ({
	uploadUserPhoto: photoActionMocks.uploadUserPhoto,
}));

vi.mock("sonner", () => ({
	toast: {
		success: toastMocks.success,
		error: toastMocks.error,
	},
}));

vi.mock("next/navigation", () => ({
	useParams: () => navigationMocks.useParams(),
	useRouter: () => ({
		push: vi.fn(),
		replace: vi.fn(),
		refresh: vi.fn(),
	}),
}));

const mockEnsureAnonymousSignIn = clientMocks.ensureAnonymousSignIn;
const mockUploadUserPhoto = photoActionMocks.uploadUserPhoto;
const mockToastSuccess = toastMocks.success;
const mockToastError = toastMocks.error;
const mockUseParams = navigationMocks.useParams;

const createFile = (name: string, type: string, sizeInBytes: number): File => {
	const file = new File(["dummy"], name, { type });
	Object.defineProperty(file, "size", {
		value: sizeInBytes,
		writable: false,
	});
	return file;
};

const renderUploadPage = (): void => {
	mockEnsureAnonymousSignIn.mockResolvedValue(undefined);
	mockUseParams.mockReturnValue({ boothId });
	render(<UploadPage />);
};

describe("[RED] UploadPage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("ensures anonymous sign-in on mount", async () => {
		renderUploadPage();

		await waitFor(() => {
			expect(mockEnsureAnonymousSignIn).toHaveBeenCalled();
		});
	});

	it("enables upload button for valid file and calls uploadUserPhoto", async () => {
		renderUploadPage();
		const fileInput = screen.getByLabelText(/写真ファイル/);
		const uploadButton = screen.getByRole("button", { name: "アップロード" });

		expect(uploadButton).toBeDisabled();

		const validFile = createFile("visitor.png", "image/png", 1024);
		const user = userEvent.setup();
		await user.upload(fileInput, validFile);

		expect(uploadButton).not.toBeDisabled();

		mockUploadUserPhoto.mockResolvedValue({
			photoId: "uploaded-photo-1",
			imagePath: "photos/uploaded-photo-1/photo.png",
			imageUrl: "https://example.com/photo.png",
		});

		await user.click(uploadButton);

		expect(mockUploadUserPhoto).toHaveBeenCalledWith({
			boothId,
			file: validFile,
		});
		expect(mockToastSuccess).toHaveBeenCalled();
	});

	it("rejects files with unsupported mime types", async () => {
		renderUploadPage();
		const fileInput = screen.getByLabelText(/写真ファイル/);
		const uploadButton = screen.getByRole("button", { name: "アップロード" });

		const invalidFile = createFile("visitor.gif", "image/gif", 1024);
		fireEvent.change(fileInput, {
			target: { files: [invalidFile] },
		});

		await waitFor(() => {
			expect(uploadButton).toBeDisabled();
		});
		await screen.findByText(/対応していないファイル形式/);
		expect(mockUploadUserPhoto).not.toHaveBeenCalled();
	});

	it("rejects files larger than 20MB", async () => {
		renderUploadPage();
		const fileInput = screen.getByLabelText(/写真ファイル/);
		const uploadButton = screen.getByRole("button", { name: "アップロード" });

		const largeFile = createFile("large.png", "image/png", 21 * 1024 * 1024);
		const user = userEvent.setup();
		await user.upload(fileInput, largeFile);

		expect(uploadButton).toBeDisabled();
		expect(screen.getByText(/20MB以下/)).toBeInTheDocument();
		expect(mockUploadUserPhoto).not.toHaveBeenCalled();
	});

	it("shows error notification when upload fails", async () => {
		renderUploadPage();
		const fileInput = screen.getByLabelText(/写真ファイル/);
		const uploadButton = screen.getByRole("button", { name: "アップロード" });

		const validFile = createFile("visitor.png", "image/png", 1024);
		const user = userEvent.setup();
		await user.upload(fileInput, validFile);

		mockUploadUserPhoto.mockRejectedValue(new Error("network error"));

		await user.click(uploadButton);

		await waitFor(() => {
			expect(mockToastError).toHaveBeenCalled();
		});
	});
});
