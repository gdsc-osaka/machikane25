import type { StaffAccess } from "@/application/auth/require-staff";

type AuthorizedStaff = Extract<StaffAccess, { status: "authorized" }>;

type StaffGateState =
	| { status: "loading" }
	| { status: "needs-auth" }
	| { status: "authorized"; staff: AuthorizedStaff["staff"] }
	| { status: "error"; error: Error };

export type { StaffGateState };
