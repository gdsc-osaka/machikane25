/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import * as logger from "firebase-functions/logger";
import { onRequest } from "firebase-functions/v2/https";
// Some environments may not have up-to-date type declarations for these v2 paths.
// @ts-ignore
import { onObjectFinalized } from "firebase-functions/v2/storage";
// @ts-ignore
import { onSchedule } from "firebase-functions/v2/scheduler";
// @ts-ignore
import * as admin from "firebase-admin";

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

export const helloWorld = onRequest(
	{ region: "asia-northeast2" },
	(request: any, response: any) => {
		logger.info("Hello logs!", { structuredData: true });
		response.send("Hello from Firebase!");
	},
);

// Initialize Admin SDK
if (!admin.apps.length) {
	admin.initializeApp();
}

const db = admin.firestore();
const storage = admin.storage();
const TASKS_COLLECTION = "photo-cleaner-delete-tasks";

/**
 * When a new object is finalized in Storage, create a Firestore task to delete it 15 minutes later.
 */
export const scheduleDelete = onObjectFinalized({ region: "asia-northeast2" }, async (object: any) => {
	try {
		const bucket = (object && object.bucket) || undefined;
		const name = (object && object.name) || undefined;
		if (!bucket || !name) {
			logger.warn('Received storage finalize without bucket or name', { object });
			return;
		}

		const now = Date.now();
		const deleteAt = new Date(now + 15 * 60 * 1000); // 15 minutes

		await db.collection(TASKS_COLLECTION).add({
			bucket,
			name,
			status: 'pending',
			createdAt: admin.firestore.Timestamp.fromMillis(now),
			deleteAt: admin.firestore.Timestamp.fromDate(deleteAt),
		});

		logger.info('Scheduled delete for storage object', { bucket, name, deleteAt: deleteAt.toISOString() });
	} catch (err) {
		logger.error('Error scheduling delete for storage object', err);
	}
});

/**
 * Runs every minute and deletes expired tasks from Storage.
 */
export const runCleaner = onSchedule({ region: "asia-northeast2", schedule: 'every 1 minutes' }, async (event: any) => {
	const now = admin.firestore.Timestamp.now();
	try {
		const q = db.collection(TASKS_COLLECTION)
			.where('status', '==', 'pending')
			.where('deleteAt', '<=', now)
			.limit(100);

		const snap = await q.get();
		if (snap.empty) {
			logger.debug('No expired delete tasks');
			return;
		}

		for (const doc of snap.docs) {
			const data = doc.data();
			// try to mark as deleting to avoid races
			try {
				await db.runTransaction(async (tx: any) => {
					const d = await tx.get(doc.ref);
					if (!d.exists) return;
					const status = d.get('status');
					if (status !== 'pending') return;
					tx.update(doc.ref, { status: 'deleting', startedAt: admin.firestore.Timestamp.now() });
				});

				try {
					await storage.bucket(data.bucket).file(data.name).delete();
					await doc.ref.update({ status: 'deleted', deletedAt: admin.firestore.Timestamp.now() });
					logger.info('Deleted storage object', { id: doc.id, bucket: data.bucket, name: data.name });
				} catch (err) {
					// file deletion failed
					await doc.ref.update({ status: 'failed', error: String(err), lastAttemptAt: admin.firestore.Timestamp.now() });
					logger.error('Failed to delete storage object', { id: doc.id, error: err });
				}
			} catch (txErr) {
				logger.error('Transaction failed for delete task', { id: doc.id, error: txErr });
			}
		}
	} catch (err) {
		logger.error('Error running cleaner', err);
	}
});
