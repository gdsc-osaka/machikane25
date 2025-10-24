/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import { logger } from "firebase-functions";
import { onRequest } from "firebase-functions/v2/https";
// Some environments may not have up-to-date type declarations for these v2 paths.
import { onObjectFinalized } from "firebase-functions/v2/storage";
import * as admin from "firebase-admin";
import { CloudTasksClient } from "@google-cloud/tasks";
// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// Initialize Admin SDK
if (!admin.apps.length) {
	admin.initializeApp();
}

const db = admin.firestore();
const storage = admin.storage();

const TASKS_COLLECTION = "photo-cleaner-delete-tasks";
const REGION = "asia-northeast2";
const PROJECT_ID = process.env.GCP_PROJECT || process.env.GCLOUD_PROJECT!;
const LOCATION_ID = "asia-northeast2";
const QUEUE_ID = "file-delete-queue";

const tasksClient = new CloudTasksClient();

/**
 * ファイルが Cloud Storage にアップロードされたとき、
 * Cloud Tasks を使用して 15分後に削除タスクをスケジュールする。
 */
export const scheduleDelete = onObjectFinalized({ region: REGION }, async (object: any) => {
	try {
		const bucket = object.bucket;
		const filePath = object.name;
		if (!bucket || !filePath) {
			logger.warn('Received storage finalize without bucket or name', { object });
			return;
		}

		if (!filePath.startsWith("photos/"))return;

		await db.collection(TASKS_COLLECTION).add({
			bucket,
			filePath,
		});

		// 15分後に実行される削除タスクを作成
		const url = `https://${REGION}-${PROJECT_ID}.cloudfunctions.net/deleteFile`;
		const payload = JSON.stringify({ bucket, filePath});

		const parent = tasksClient.queuePath(PROJECT_ID, LOCATION_ID, QUEUE_ID);
		const task = {
			httpRequest: {
				httpMethod: "POST",
				url,
				headers: { "Content-Type": "application/json" },
				body: Buffer.from(payload).toString("base64"),
			},
			scheduleTime: {
				seconds: Math.floor(Date.now() / 1000) + 15 * 60, // 15分後
			},
		};

		await tasksClient.createTask({ parent, task });
		logger.info("Scheduled file deletion via Cloud Tasks", {
			filePath,
			deleteAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
		});
	} catch (error) {
		logger.error("Error scheduling delete task", error);
	}
});

/**
 * Cloud Tasks によって呼び出され、指定ファイルと Firestore データを削除する関数。
 */
export const deleteFile = onRequest({ region: REGION }, async (req, res) => {
	try {
		const { bucket, filePath } = req.body;
		if (!bucket || !filePath) {
			logger.warn("Invalid delete request", req.body);
			res.status(400).send("Invalid request");
			return;
		}

		// Storage ファイル削除
		await storage.bucket(bucket).file(filePath).delete();
		logger.info("Deleted file from storage", { bucket, filePath });

		// Firestore データ削除
		const snap = await db.collection(TASKS_COLLECTION).where("filePath", "==", filePath).get();
		if (snap.empty) return;
		const batch = db.batch();
		snap.docs.forEach((doc) => batch.delete(doc.ref));
		await batch.commit();

		logger.info("Deleted Firestore data for file", { filePath });

		res.status(200).send("File and Firestore data deleted successfully");
	} catch (error) {
		logger.error("Failed to delete file or Firestore data", error);
		res.status(500).send("Deletion failed");
	}
});