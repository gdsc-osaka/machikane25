import { errAsync, okAsync, Result, ResultAsync } from "neverthrow";
import { GetFaceEmbedding } from "../infra/face-embedding-repo";
import {
  DeleteFaceEmbedding,
  FindCustomerIdByFaceEmbedding,
  InsertFaceEmbedding,
} from "../infra/face-auth-repo";
import {
  DeleteDBCustomerById,
  FindDBCustomerById,
  FindVisitingDBCustomersByStoreId,
  InserttDBCustomer,
  UpdateDBCustomer,
} from "../infra/customer-repo";
import db, { DBorTx } from "../db/db";
import firebase, { firestoreDB } from "../firebase";
import type { FaceEmbeddingError } from "../infra/face-embedding-repo.error";
import type { FirestoreInternalError } from "../infra/shared/firestore-error";
import {
  checkCustomerBelongsToStore,
  checkTosNotAccepted,
  createCustomer,
  createCustomerWithTosAccepted,
  CustomerId,
  CustomerNotBelongsToStoreError,
  CustomerTosAlreadyAcceptedError,
  DBCustomer,
  InvalidCustomerError,
} from "../domain/customer";
import type {
  CustomerAlreadyExistsError,
  CustomerNotFoundError,
} from "../infra/customer-repo.error";
import type { DBInternalError } from "../infra/shared/db-error";
import { RunTransaction } from "../infra/transaction";
import env from "../env";
import { FetchDBStoreByPublicId } from "../infra/store-repo";
import { DBStoreNotFoundError } from "../infra/store-repo.error";
import type { FaceAuthError } from "../infra/face-auth-repo.error";
import {
  DBVisitNotFoundError,
  InsertDBVisit,
  UpdateDBVisitByStoreIdAndCustomerId,
} from "../infra/visit-repo";
import { createVisit, createVisitForCheckout } from "../domain/visit";
import { iife, unpack2 } from "../shared/func";
import { StoreId } from "../domain/store";
import {
  DBCustomerSessionAlreadyExistsError,
  InsertDBCustomerSession,
} from "../infra/customer-session-repo";
import {
  createCustomerSession,
  CustomerSession,
  DBCustomerSession,
  validateCustomerSession,
} from "../domain/customer-session";
import {
  CustomerWithProfiles,
  InvalidProfileError,
  validateCustomerWithProfilesList,
} from "../domain/profile";
import { match } from "ts-pattern";

// =============
// == Command ==
// =============

export type RegisterCustomer = (
  storeId: string,
  image: File
) => ResultAsync<
  CustomerSession,
  | FaceEmbeddingError
  | FirestoreInternalError
  | DBInternalError
  | DBStoreNotFoundError
  | CustomerAlreadyExistsError
  | DBCustomerSessionAlreadyExistsError
  | InvalidCustomerError
>;

export const registerCustomer =
  (
    runTransaction: RunTransaction,
    fetchDBStoreByPublicId: FetchDBStoreByPublicId,
    getFaceEmbedding: GetFaceEmbedding,
    insertFaceEmbedding: InsertFaceEmbedding,
    insertDBCustomer: InserttDBCustomer,
    insertDBVisit: InsertDBVisit,
    insertDBCustomerSession: InsertDBCustomerSession
  ): RegisterCustomer =>
  (storeId, image: File) => {
    return ResultAsync.combine([
      getFaceEmbedding(image),
      fetchDBStoreByPublicId(db)(storeId).andThen(createCustomer),
    ]).andThen(([embedding, customer]) =>
      insertFaceEmbedding(firestoreDB(firebase(env.FIRE_SA).firestore()))(
        customer,
        embedding
      )
        .andThen(() =>
          runTransaction(db)((tx) =>
            // customer を先に insert しないと foregin key violation になるので注意
            insertDBCustomer(tx)(customer).andThen((customer) =>
              ResultAsync.combine([
                okAsync(customer),
                createCustomerSession(customer).asyncAndThen(
                  insertDBCustomerSession(tx)
                ),
                createVisit(customer.storeId, customer.id).asyncAndThen(
                  insertDBVisit(tx)
                ),
              ])
            )
          )
        )
        .andThen(unpack2(validateCustomerSession))
    );
  };

export type AuthenticateCustomer = (
  storeId: string,
  image: File
) => ResultAsync<
  CustomerSession,
  | FaceEmbeddingError
  | FaceAuthError
  | FirestoreInternalError
  | CustomerNotFoundError
  | DBInternalError
  | DBStoreNotFoundError
  | DBCustomerSessionAlreadyExistsError
  | InvalidCustomerError
  | CustomerNotBelongsToStoreError
>;
type CustomerSessionErrors =
  | DBInternalError
  | CustomerNotFoundError
  | CustomerNotBelongsToStoreError
  | DBCustomerSessionAlreadyExistsError
  | InvalidCustomerError;
export const authenticateCustomer =
  (
    runTransaction: RunTransaction,
    fetchDBStoreByPublicId: FetchDBStoreByPublicId,
    getFaceEmbedding: GetFaceEmbedding,
    findCustomerIdByFaceEmbedding: FindCustomerIdByFaceEmbedding,
    findDBCustomerById: FindDBCustomerById,
    insertDBVisit: InsertDBVisit,
    insertDBCustomerSession: InsertDBCustomerSession,
    updateDBVisitByStoreIdAndCustomerId: UpdateDBVisitByStoreIdAndCustomerId
  ): AuthenticateCustomer =>
  (storeId, image) =>
    ResultAsync.combine([
      getFaceEmbedding(image).andThen(
        findCustomerIdByFaceEmbedding(
          firestoreDB(firebase(env.FIRE_SA).firestore())
        )
      ),
      fetchDBStoreByPublicId(db)(storeId),
    ])
      .andThen(([customerId, store]) =>
        createVisit(store.id, customerId).map(
          (visit) => [customerId, store, visit] as const
        )
      )
      .andThen(([customerId, store, visit]) =>
        runTransaction(db)((tx) =>
          // TODO: Refactor this code
          iife((): ResultAsync<CustomerSession, CustomerSessionErrors> => {
            const customer: ResultAsync<DBCustomer, CustomerSessionErrors> =
              findDBCustomerById(tx)(customerId).andThen((customer) =>
                checkCustomerBelongsToStore(customer, store)
              );

            const dbSession: ResultAsync<
              DBCustomerSession,
              CustomerSessionErrors
            > = customer.andThen((customer) =>
              createCustomerSession(customer).asyncAndThen(
                insertDBCustomerSession(tx)
              )
            );

            const session: ResultAsync<CustomerSession, CustomerSessionErrors> =
              ResultAsync.combine([customer, dbSession]).andThen(
                ([customer, session]) =>
                  validateCustomerSession(customer, session)
              );

            const updateVisit = createVisitForCheckout()
              .asyncAndThen((visit) =>
                updateDBVisitByStoreIdAndCustomerId(tx)(
                  store.id,
                  customerId,
                  visit
                ).orElse((err) =>
                  match(err)
                    .with(DBVisitNotFoundError.is, () => okAsync())
                    .otherwise((err) => errAsync(err))
                )
              )
              .andThen(() => insertDBVisit(tx)(visit));

            return session.andThen((session) => updateVisit.map(() => session));
          })
        )
      );

export type CheckoutCustomer = (
  customerId: CustomerId,
  storeId: StoreId
) => ResultAsync<void, DBInternalError | DBVisitNotFoundError>;

// export const checkoutCustomer =
//   (
//     runTransaction: RunTransaction,
//     findVisitByCustomerIdAndStoreId: FetchDBVisitByStoreIdAndCustomerId,
//     updateDBVisit: UpdateDBVisitById
//   ): CheckoutCustomer =>
//   (customerId, storeId) =>
//     runTransaction(db)((tx) =>
//       // fetch the visit is enough because of the foreign key constraint of customer and store
//       findVisitByCustomerIdAndStoreId(tx)(storeId, customerId)
//         .andThen(createVisitForCheckout)
//         .andThen(updateDBVisit(tx))
//     ).map(voidify);

export type AcceptCustomerTos = (
  customerId: CustomerId
) => ResultAsync<
  void,
  | DBInternalError
  | CustomerNotFoundError
  | CustomerTosAlreadyAcceptedError
  | InvalidCustomerError
>;

export const acceptCustomerTos =
  (
    runTransaction: RunTransaction,
    findDBCustomerById: FindDBCustomerById,
    updateDBCustomer: UpdateDBCustomer
  ): AcceptCustomerTos =>
  (customerId) =>
    runTransaction(db)((tx: DBorTx) =>
      findDBCustomerById(tx)(customerId)
        .andThen((customer) =>
          Result.combine([
            createCustomerWithTosAccepted(customer),
            checkTosNotAccepted(customer),
          ])
        )
        .andThen(([customer]) => updateDBCustomer(tx)(customer))
    ).map(() => undefined);

export type DeclineCustomerTos = (
  customerId: CustomerId
) => ResultAsync<
  void,
  DBInternalError | CustomerNotFoundError | FirestoreInternalError
>;

export const declineCustomerTos =
  (
    runTransaction: RunTransaction,
    findDBCustomerById: FindDBCustomerById, // To ensure customer exists before deleting
    deleteDBCustomerById: DeleteDBCustomerById,
    deleteEmbedding: DeleteFaceEmbedding
  ): DeclineCustomerTos =>
  (customerId) =>
    // First, delete the database record
    runTransaction(db)((tx: DBorTx) =>
      findDBCustomerById(tx)(customerId) // Ensure it exists before trying to delete
        .andThen(() => deleteDBCustomerById(tx)(customerId))
    )
      // Then, delete the face embedding data from Firestore
      .andThen(() =>
        deleteEmbedding(firestoreDB(firebase(env.FIRE_SA).firestore()))(
          customerId
        )
      );

// =============
// === Query ===
// =============

export type FetchVisitingCustomers = (
  storeId: StoreId
) => ResultAsync<
  CustomerWithProfiles[],
  | DBInternalError
  | CustomerNotFoundError
  | InvalidCustomerError
  | InvalidProfileError
  | DBStoreNotFoundError
>;

export const fetchVisitingCustomers =
  (
    fetchDBStoreByPublicId: FetchDBStoreByPublicId,
    findVisitingDBCustomersByStoreId: FindVisitingDBCustomersByStoreId
  ): FetchVisitingCustomers =>
  (storeId) =>
    fetchDBStoreByPublicId(db)(storeId)
      .map((store) => store.id)
      .andThen(findVisitingDBCustomersByStoreId(db))
      .andThen(validateCustomerWithProfilesList);
