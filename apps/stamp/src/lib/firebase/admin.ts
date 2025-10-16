/* v8 ignore start */
import { getApp, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const initAdminApp = () => {
	if (!getApps().length) {
		const projectId =
			process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "machikane25";
		initializeApp({ projectId });
	}
	return getApp();
};

export const getAdminApp = () => initAdminApp();

export const getAdminFirestore = () => getFirestore(initAdminApp());
