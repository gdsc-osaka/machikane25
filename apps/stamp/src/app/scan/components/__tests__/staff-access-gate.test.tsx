import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StaffAccessGate } from "../staff-access-gate";

vi.mock("@/firebase", () => ({
	getFirebaseAuth: () => ({
		currentUser: { uid: "staff-123" },
	}),
	getFirebaseApp: () => ({}),
}));

describe("StaffAccessGate", () => {
	it("renders loading spinner message", () => {
		render(<StaffAccessGate state={{ status: "loading" }} />);
		expect(
			screen.getByText("職員認証の状態を確認しています…"),
		).toBeInTheDocument();
	});

	it("renders needs-auth card with instructions", () => {
		render(<StaffAccessGate state={{ status: "needs-auth" }} />);
		expect(screen.getByTestId("staff-login-gate")).toBeInTheDocument();
	});

	it("throws when authentication fails", () => {
		const error = new Error("auth failed");
		expect(() =>
			render(<StaffAccessGate state={{ status: "error", error }} />),
		).toThrow(error);
	});
});
