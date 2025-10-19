import { DB, Transaction } from "../db/db";
import { ResultAsync } from "neverthrow";
import { Firestore, FirestoreTransaction } from "../firebase";

export type RunTransaction = (
  db: DB
) => <T, E>(
  operation: (tx: Transaction) => ResultAsync<T, E>
) => ResultAsync<T, E>;

export const runTransaction: RunTransaction = (db) => (operation) =>
  ResultAsync.fromSafePromise(
    db.transaction(async (tx) => await operation(tx))
  ).andThen((res) => res);

export type RunFirestoreTransaction = (
  db: Firestore
) => <T, E>(
  operation: (tx: FirestoreTransaction) => ResultAsync<T, E>
) => ResultAsync<T, E>;

export const runFirestoreTransaction: RunFirestoreTransaction =
  (db) => (operation) =>
    ResultAsync.fromSafePromise(
      db.runTransaction(async (tx) => await operation(tx))
    ).andThen((res) => res);

export type RunDBAndFirestoreTransaction = (
  db: DB,
  firestore: Firestore
) => <T, E>(
  operation: (
    tx: Transaction,
    firestoreTx: FirestoreTransaction
  ) => ResultAsync<T, E>
) => ResultAsync<T, E>;

export const runDBAndFirestoreTransaction: RunDBAndFirestoreTransaction =
  (db, firestore) => (operation) =>
    ResultAsync.fromSafePromise(
      db.transaction(async (tx) =>
        firestore.runTransaction(
          async (firestoreTx) => await operation(tx, firestoreTx)
        )
      )
    ).andThen((res) => res);
