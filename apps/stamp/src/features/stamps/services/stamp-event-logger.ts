import type { MaintenanceStatus } from "@/lib/config/remote-config";
import { getAdminFirestore } from "@/lib/firebase/admin";
import type { StampId } from "../server/validate-token";

export type StampEventStatus =
	| "granted"
	| "duplicate"
	| "invalid"
	| "maintenance";

export type StampEventPayload = {
	stampId?: StampId;
	status: StampEventStatus;
	maintenanceStatus?: MaintenanceStatus;
};

export const logStampEvent = async (
	uid: string,
	payload: StampEventPayload,
) => {
	const firestore = getAdminFirestore();
	const docRef = firestore
		.collection("users")
		.doc(uid)
		.collection("stampEvents");
	await docRef.add({
		stampId: payload.stampId ?? null,
		status: payload.status,
		maintenanceStatus: payload.maintenanceStatus ?? "online",
		createdAt: Date.now(),
	});
};
