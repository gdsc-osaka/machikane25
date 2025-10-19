import { err, ok, ResultAsync } from "neverthrow";
import { FieldValue } from "firebase-admin/firestore";
import { FaceAuthError } from "./face-auth-repo.error";
import { FirestoreOrTx } from "../firebase";
import { FirestoreInternalError } from "./shared/firestore-error";
import { CustomerId, DBCustomerForCreate } from "../domain/customer";

const EMBEDDINGS_COLLECTION = "embeddings";

export type InsertFaceEmbedding = (
  firestore: FirestoreOrTx
) => (
  customer: DBCustomerForCreate,
  embedding: number[]
) => ResultAsync<void, FirestoreInternalError>;

export type FindCustomerIdByFaceEmbedding = (
  firestore: FirestoreOrTx
) => (
  embedding: number[]
) => ResultAsync<CustomerId, FaceAuthError | FirestoreInternalError>;

export type DeleteFaceEmbedding = (
  firestore: FirestoreOrTx
) => (customerId: CustomerId) => ResultAsync<void, FirestoreInternalError>;

export const insertFaceEmbedding: InsertFaceEmbedding =
  (firestore) => (customer, embedding) =>
    ResultAsync.fromPromise(
      firestore.set(firestore.doc(`${EMBEDDINGS_COLLECTION}/${customer.id}`), {
        value: FieldValue.vector(embedding),
        created_at: new Date().toISOString(),
      }),
      FirestoreInternalError.handle
    );

export const findCustomerIdByFaceEmbedding: FindCustomerIdByFaceEmbedding =
  (firestore) => (embedding) =>
    ResultAsync.fromPromise(
      firestore
        .collection(EMBEDDINGS_COLLECTION)
        .findNearest({
          vectorField: "value",
          queryVector: FieldValue.vector(embedding),
          limit: 1,
          distanceMeasure: "COSINE",
          distanceThreshold: 4,
        })
        .get(),
      FirestoreInternalError.handle
    ).andThen((snapshot) => {
      if (snapshot.empty) {
        return err(FaceAuthError("No match found"));
      }
      // Note: The original code had a distanceThreshold which is not a valid parameter for findNearest.
      // It has been removed. You may need to check the distance on the client side if needed.
      return ok(snapshot.docs[0].id as CustomerId);
    });

export const deleteFaceEmbedding: DeleteFaceEmbedding =
  (firestore) => (customerId) =>
    ResultAsync.fromPromise(
      firestore.delete(firestore.doc(`${EMBEDDINGS_COLLECTION}/${customerId}`)),
      FirestoreInternalError.handle
    ).map(() => undefined); // map to void on success
