import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { SurveyLedgerError } from "@/domain/survey";

type CollectionReference = { path: string };
type DocumentReference = { id: string; collectionPath: string };

const collectionMock =
	vi.fn<(firestore: unknown, path: string) => CollectionReference>();
const docMock = vi.fn<
	(collectionRef: CollectionReference, id: string) => DocumentReference
>();
const setDocMock = vi.fn<
	(DocumentReference: DocumentReference, data: unknown, options: unknown) => Promise<void>
>();

const fromMaybeMillisSpy = vi.fn((millis: number | null) => {
	if (millis === null) {
		return null;
	}
	return { millis };
});

vi.mock("firebase/firestore", () => ({
	collection: collectionMock,
	doc: docMock,
	setDoc: setDocMock,
}));

vi.mock("@/infra/timestamp", () => ({
	timestampUtils: {
		fromMaybeMillis: fromMaybeMillisSpy,
	},
}));

let createSurveyLedger: typeof import("../survey-ledger")["createSurveyLedger"];

beforeAll(async () => {
	({ createSurveyLedger } = await import("../survey-ledger"));
});

beforeEach(() => {
	collectionMock.mockReset();
	collectionMock.mockImplementation((_firestore, path) => ({ path }));
	docMock.mockReset();
	docMock.mockImplementation((collectionRef, id) => ({
		id,
		collectionPath: collectionRef.path,
	}));
	setDocMock.mockReset();
	fromMaybeMillisSpy.mockReset();
});

describe("createSurveyLedger.markCompleted", () => {
	const baseInput = {
		attendeeId: "guest-1",
		completedAt: 1_700_000_000_000,
		responseId: "response-123",
	};

	it("updates survey ledger and attendee documents", async () => {
		const timestamp = { millis: baseInput.completedAt };
		fromMaybeMillisSpy.mockReturnValue(timestamp);
		setDocMock.mockResolvedValue(undefined);

		const ledger = createSurveyLedger({} as never);
		const result = await ledger.markCompleted(baseInput);

		expect(result.isOk()).toBe(true);
		expect(fromMaybeMillisSpy).toHaveBeenCalledWith(1_700_000_000_000);
		expect(setDocMock).toHaveBeenCalledTimes(2);

		const [ledgerDoc, ledgerData, ledgerOptions] = setDocMock.mock.calls[0] ?? [];
		expect((ledgerDoc as DocumentReference).collectionPath).toBe("surveyLedger");
		expect(ledgerData).toEqual({
			completedAt: timestamp,
			responseId: "response-123",
		});
		expect(ledgerOptions).toEqual({ merge: true });

		const [userDoc, userData] = setDocMock.mock.calls[1] ?? [];
		expect((userDoc as DocumentReference).collectionPath).toBe("users");
		expect(userData).toEqual({
			stamps: {
				survey: timestamp,
			},
			survey: {
				completedAt: timestamp,
				responseId: "response-123",
			},
		});
	});

	it("wraps failures using SurveyLedgerError", async () => {
		fromMaybeMillisSpy.mockReturnValue({ millis: baseInput.completedAt });
		setDocMock.mockImplementationOnce(() =>
			Promise.reject(new Error("write failed")),
		);
		setDocMock.mockImplementationOnce(() => Promise.resolve());

		const ledger = createSurveyLedger({} as never);
		const result = await ledger.markCompleted(baseInput);

		expect(result.isErr()).toBe(true);
		const error = result._unsafeUnwrapErr();
		expect(SurveyLedgerError.isFn(error)).toBe(true);
		expect(error.extra?.operation).toBe("markCompleted");
	});
});
