import { type FieldValue, Timestamp } from "firebase/firestore";

export const timestampUtils = {
	fromMaybeMillis: (
		millis: number | FieldValue | null,
	): Timestamp | FieldValue | null => {
		if (millis === null) {
			return null;
		}
		if (typeof millis === "number") {
			return Timestamp.fromMillis(millis);
		}
		return millis;
	},
};
