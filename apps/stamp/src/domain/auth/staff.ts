import { err, ok, type Result } from "neverthrow";
import { errorBuilder, type InferError } from "obj-err";
import { z } from "zod";

const staffAccountSchema = z.object({
	uid: z.string().min(1),
	email: z.string().email().nullable(),
	displayName: z.string().nullable(),
});

type StaffAccount = z.infer<typeof staffAccountSchema>;

const StaffAccountInvariantError = errorBuilder(
	"StaffAccountInvariantError",
	z.object({
		issues: z
			.array(z.any().transform((value) => value as z.ZodIssue))
			.optional(),
	}),
);

type StaffAccountInvariantError = InferError<typeof StaffAccountInvariantError>;

const StaffAuthorizationError = errorBuilder(
	"StaffAuthorizationError",
	z.object({
		reason: z.union([z.literal("missing_claim"), z.literal("not_staff")]),
	}),
);

type StaffAuthorizationError = InferError<typeof StaffAuthorizationError>;

const isClaimsRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;

const ensureStaffAuthorization = (
	claims: unknown,
): Result<true, StaffAuthorizationError> => {
	if (!isClaimsRecord(claims) || !Object.hasOwn(claims, "isStaff")) {
		return err(
			StaffAuthorizationError("Staff custom claim is missing.", {
				extra: { reason: "missing_claim" },
			}),
		);
	}
	const flag = claims.isStaff;
	if (flag !== true) {
		return err(
			StaffAuthorizationError("User is not authorized for staff access.", {
				extra: { reason: "not_staff" },
			}),
		);
	}
	return ok(true);
};

const createStaffAccount = (
	input: unknown,
): Result<StaffAccount, StaffAccountInvariantError> => {
	const validation = staffAccountSchema.safeParse(input);
	if (!validation.success) {
		return err(
			StaffAccountInvariantError("Staff account failed validation.", {
				extra: { issues: validation.error.issues },
			}),
		);
	}
	return ok(validation.data);
};

export {
	createStaffAccount,
	ensureStaffAuthorization,
	StaffAccountInvariantError,
	StaffAuthorizationError,
};
export type { StaffAccount };
