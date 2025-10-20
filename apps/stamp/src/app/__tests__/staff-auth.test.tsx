import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

type StaffAccount = {
	uid: string;
	email: string | null;
	displayName: string | null;
};

type StaffAccess =
	| { status: "needs-auth" }
	| { status: "authorized"; staff: StaffAccount };

const { requireStaffMock } = vi.hoisted(() => {
	const mock = vi.fn<() => Promise<StaffAccess>>();
	return { requireStaffMock: mock };
});

vi.mock("@/application/auth/require-staff", () => ({
	requireStaff: requireStaffMock,
}));

const importScanPage = async () => {
	// @ts-expect-error -- scan page implemented in US3 tasks
	const module = await import("../scan/page");
	return module.default;
};

const renderScanPage = async () => {
	const Page = await importScanPage();
	const content = await Page();
	return render(content);
};

describe("ScanPage staff access control", () => {
	beforeEach(() => {
		requireStaffMock.mockReset();
	});

	it("shows the staff login gate when the guard requests authentication", async () => {
		requireStaffMock.mockResolvedValue({ status: "needs-auth" });

		await renderScanPage();

		expect(await screen.findByTestId("staff-login-gate")).toBeInTheDocument();
		expect(screen.queryByTestId("staff-scan-console")).toBeNull();
		expect(requireStaffMock).toHaveBeenCalledTimes(1);
	});

	it("renders the scan console for an authorized staff member", async () => {
		const staff: StaffAccount = {
			uid: "staff-123",
			email: "staff@example.com",
			displayName: "Festival Staff",
		};
		requireStaffMock.mockResolvedValue({
			status: "authorized",
			staff,
		});

		await renderScanPage();

		expect(await screen.findByTestId("staff-scan-console")).toBeInTheDocument();
		expect(screen.queryByTestId("staff-login-gate")).toBeNull();
		expect(requireStaffMock).toHaveBeenCalledTimes(1);
	});

	it("surfaces guard failures so they can be captured by error boundaries", async () => {
		const guardError = new Error("staff guard failure");
		requireStaffMock.mockRejectedValue(guardError);

		await expect(renderScanPage()).rejects.toThrow(guardError);
		expect(requireStaffMock).toHaveBeenCalledTimes(1);
	});
});
