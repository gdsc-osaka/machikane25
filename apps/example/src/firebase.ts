import * as admin from "firebase-admin";
import { app, firestore } from "firebase-admin";

import DocumentReference = firestore.DocumentReference;
import DocumentSnapshot = firestore.DocumentSnapshot;
import WithFieldValue = firestore.WithFieldValue;
import PartialWithFieldValue = firestore.PartialWithFieldValue;
import UpdateData = firestore.UpdateData;
import CollectionReference = firestore.CollectionReference;

export default function (FIRE_SA: string): app.App {
  if (admin.apps.length > 0 && admin.apps[0]) {
    return admin.apps[0];
  }

  return admin.initializeApp({
    credential: admin.credential.cert(
      JSON.parse(FIRE_SA) as admin.ServiceAccount
    ),
  });
}

export type Firestore = firestore.Firestore;
export type FirestoreTransaction = firestore.Transaction;
type DocumentData = firestore.DocumentData;
type SetOptions = firestore.SetOptions;

export interface FirestoreOrTx {
  doc(path: string): DocumentReference;
  collection(collectionPath: string): CollectionReference;
  get<
    AppModelType = DocumentData,
    DbModelType extends DocumentData = DocumentData,
  >(
    docRef: DocumentReference<AppModelType, DbModelType>
  ): Promise<DocumentSnapshot<AppModelType, DbModelType>>;

  create<
    AppModelType = DocumentData,
    DbModelType extends DocumentData = DocumentData,
  >(
    docRef: DocumentReference<AppModelType, DbModelType>,
    data: WithFieldValue<AppModelType>
  ): Promise<void>;

  set<
    AppModelType = DocumentData,
    DbModelType extends DocumentData = DocumentData,
  >(
    docRef: DocumentReference<AppModelType, DbModelType>,
    data: PartialWithFieldValue<AppModelType>,
    options?: SetOptions
  ): Promise<void>;

  update<
    AppModelType = DocumentData,
    DbModelType extends DocumentData = DocumentData,
  >(
    docRef: DocumentReference<AppModelType, DbModelType>,
    data: UpdateData<DbModelType>
  ): Promise<void>;

  delete<
    AppModelType = DocumentData,
    DbModelType extends DocumentData = DocumentData,
  >(
    docRef: DocumentReference<AppModelType, DbModelType>
  ): Promise<void>;
}

/**
 * `Firestore` または `Transaction` オブジェクトを受け取り、
 * 統一されたインターフェースを持つラッパーオブジェクトを返します。
 *
 * @param dbOrTx - `Firestore` のインスタンスまたは `Transaction` オブジェクト。
 * @returns {FirestoreOrTx} CRUD 操作を統一的に実行できるラッパーオブジェクト。
 */
export const firestoreDB = (dbOrTx: Firestore): FirestoreOrTx => {
  return {
    doc: (path: string) => dbOrTx.doc(path),
    collection: (collectionPath: string) => dbOrTx.collection(collectionPath),
    get: (docRef) => docRef.get(),
    create: async (docRef, data) => {
      await docRef.create(data);
    },
    set: async (docRef, data, options = {}) => {
      await docRef.set(data, options);
    },
    update: async (docRef, data) => {
      await docRef.update(data);
    },
    delete: async (docRef) => {
      await docRef.delete();
    },
  };
};

export const firestoreTransaction = (
  tx: FirestoreTransaction,
  firestore: Firestore
): FirestoreOrTx => {
  return {
    doc: (path: string) => firestore.doc(path),
    collection: (collectionPath: string) =>
      firestore.collection(collectionPath),
    get: (docRef) => tx.get(docRef),
    create: (docRef, data) => {
      tx.create(docRef, data);
      return Promise.resolve();
    },
    set: (docRef, data, options = {}) => {
      tx.set(docRef, data, options);
      return Promise.resolve();
    },
    update: (docRef, data) => {
      tx.update(docRef, data);
      return Promise.resolve();
    },
    delete: (docRef) => {
      tx.delete(docRef);
      return Promise.resolve();
    },
  };
};
