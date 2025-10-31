import * as admin from "firebase-admin";
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import * as dotenv from "dotenv";
import * as path from "path";

// .envファイルを読み込む
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

// Firebase Admin SDKの初期化
if (!getApps().length) {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) {
    console.error(
      "FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set."
    );
    process.exit(1);
  }
  try {
    const serviceAccount = JSON.parse(serviceAccountKey);
    initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error) {
    console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:", error);
    process.exit(1);
  }
}

const auth = getAuth();

const setStaffClaim = async (email: string) => {
  try {
    const user = await auth.getUserByEmail(email);
    await auth.setCustomUserClaims(user.uid, { isStaff: true });
    console.log(
      `Custom claim 'isStaff: true' set for user: ${email} (UID: ${user.uid})`
    );
  } catch (error) {
    console.error(`Failed to set custom claim for ${email}:`, error);
  }
};

// コマンドライン引数からメールアドレスを取得
const email = process.argv[2];

if (!email) {
  console.log("Usage: pnpm tsx scripts/setStaffClaim.ts <email>");
  process.exit(1);
}

setStaffClaim(email);
