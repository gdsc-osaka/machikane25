/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import { CloudTasksClient } from "@google-cloud/tasks";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
// Some environments may not have up-to-date type declarations for these v2 paths.
import { onObjectFinalized } from "firebase-functions/storage";
import { onRequest } from "firebase-functions/v2/https";

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// Sample HTTP function. Can be deleted

// Initialize Admin SDK
if (!admin.apps.length) {
	admin.initializeApp();
}

const storage = admin.storage();

const REGION = "asia-northeast2";
const PROJECT_ID =
	(process.env.GCP_PROJECT || process.env.GCLOUD_PROJECT) ?? "unknown";
const LOCATION_ID = "asia-northeast2";
const QUEUE_ID = "file-delete-queue";
// Firestore collection to clear when deletion runs. Change this if your collection name differs.
const FIRESTORE_COLLECTION_TO_CLEAR = "fish_images";

if (PROJECT_ID === "unknown") {
	throw new Error("Environment value GCP-PROJECT not set");
}

const tasksClient = new CloudTasksClient();

/**
 * ファイルが Cloud Storage にアップロードされたとき、
 * Cloud Tasks を使用して当日の23:59(JST)に削除タスクをスケジュールする。
 */
export const fishCleanerExample = onObjectFinalized({ region: "us-west1" }, async (event) => {
	// ← 型を明示！
	try {
		const object = event.data; // ← event.data に ObjectMetadata が入る
		const bucket = object.bucket;
		const filePath = object.name;
		if (!bucket || !filePath) {
			logger.warn("Received storage finalize without bucket or name", {
				object,
			});
			return;
		}

		if (!filePath.startsWith("fish_images/")) return;

		// 当日の23:59（JST）に実行される削除タスクを作成
		// タイムゾーンを Asia/Tokyo (JST, UTC+9) として計算します。
		const url = `https://${REGION}-${PROJECT_ID}.cloudfunctions.net/deleteFile`;
		const payload = JSON.stringify({ bucket, filePath });

		// JST(UTC+9) の今日 23:59 を計算し、UTC エポック秒に変換して scheduleTime に設定する。
		const now = new Date();
		// 現在時刻を UTC ミリ秒で取得
		const utcMillis = now.getTime() + now.getTimezoneOffset() * 60_000;
		// JST 時刻を得る
		const jstOffsetMillis = 9 * 60 * 60 * 1000;
		const jstNow = new Date(utcMillis + jstOffsetMillis);
		// JST の当日 23:59:00.000 を作る
		const jstTarget = new Date(jstNow);
		jstTarget.setHours(23, 59, 0, 0);
		// 既に過ぎている場合は翌日へ
		if (jstTarget.getTime() <= jstNow.getTime()) {
			jstTarget.setDate(jstTarget.getDate() + 1);
		}
		// UTC に戻す
		const targetUtcMillis = jstTarget.getTime() - jstOffsetMillis;
		const scheduleSeconds = Math.floor(targetUtcMillis / 1000);

		const parent = tasksClient.queuePath(PROJECT_ID, LOCATION_ID, QUEUE_ID);
		const task = {
			httpRequest: {
				httpMethod: "POST" as const,
				url,
				headers: { "Content-Type": "application/json" },
				body: Buffer.from(payload).toString("base64"),
			},
			scheduleTime: {
				seconds: scheduleSeconds,
			},
		};

		await tasksClient.createTask({ parent, task });
		logger.info("Scheduled file deletion via Cloud Tasks", {
			filePath,
			// ログは JST の予定削除時刻を表示
			deleteAt: new Date(targetUtcMillis).toISOString(),
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
		// この関数は Cloud Tasks から実行され、fish_images の一括削除と
		// 指定のファイル削除（オプション）を行います。
		if (!bucket) {
			logger.warn("No bucket in delete request; using default bucket");
		}

		const targetBucket = bucket ? storage.bucket(bucket) : storage.bucket();

		// 1) 指定があれば個別ファイルを削除（安全のため存在チェック）
		if (filePath) {
			try {
				await targetBucket.file(filePath).delete();
				logger.info("Deleted file from storage", {
					bucket: targetBucket.name,
					filePath,
				});
			} catch (err) {
				// ファイルが存在しない場合でも先に進める
				logger.warn("Could not delete specified file (may not exist)", {
					error: err instanceof Error ? err?.message : JSON.stringify(err),
				});
			}
		}

		// 2) fish_images プレフィックス以下の全ファイルを削除
		try {
			// deleteFiles は複数ファイルを一括削除するユーティリティ
			await targetBucket.deleteFiles({ prefix: "fish_images/" });
			logger.info("Deleted all files under fish_images/ prefix", {
				bucket: targetBucket.name,
			});
		} catch (err) {
			logger.error("Failed to delete files under fish_images/ prefix", {
				error: err instanceof Error ? err?.message : JSON.stringify(err),
			});
		}

		// 3) Firestore コレクション内の全ドキュメントを削除
		try {
			const db = admin.firestore();
			const colRef = db.collection(FIRESTORE_COLLECTION_TO_CLEAR);
			const snapshot = await colRef.get();
			if (!snapshot.empty) {
				// バッチでまとめて削除（500 ドキュメント上限に注意）
				let batch = db.batch();
				let operationCount = 0;
				for (const doc of snapshot.docs) {
					batch.delete(doc.ref);
					operationCount++;
					if (operationCount === 500) {
						await batch.commit();
						batch = db.batch();
						operationCount = 0;
					}
				}
				if (operationCount > 0) await batch.commit();
				logger.info("Cleared Firestore collection", {
					collection: FIRESTORE_COLLECTION_TO_CLEAR,
				});
			} else {
				logger.info("Firestore collection already empty", {
					collection: FIRESTORE_COLLECTION_TO_CLEAR,
				});
			}
		} catch (err) {
			logger.error("Failed to clear Firestore collection", {
				collection: FIRESTORE_COLLECTION_TO_CLEAR,
				error: err instanceof Error ? err?.message : JSON.stringify(err),
			});
		}

		res.status(200).send("Deletion completed");
	} catch (error) {
		logger.error("Failed to delete file", error);
		res.status(500).send("Deletion failed");
	}
});
