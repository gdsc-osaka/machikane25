import {
  Firestore,
  collection,
  doc,
  getDoc,
  setDoc,
  query,
  where,
  getDocs,
  limit,
} from "firebase/firestore";
import { VisitorSession } from "@/domain/visitorSession";
import { visitorSessionConverter } from "./converters";
import type { VisitorSessionRepository } from "@/application/repositories";

const COLLECTION_NAME = "visitorSessions";

export const createVisitorSessionRepository = (
  firestore: Firestore,
): VisitorSessionRepository => {
  const sessionsCollection = collection(firestore, COLLECTION_NAME).withConverter(
    visitorSessionConverter,
  );

  return {
    async save(session: VisitorSession): Promise<void> {
      try {
        const sessionRef = doc(sessionsCollection, session.id);
        await setDoc(sessionRef, session);
      } catch (error) {
        throw new Error(
          `Failed to save visitor session: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    },

    async findById(id: string): Promise<VisitorSession | null> {
      try {
        const sessionRef = doc(sessionsCollection, id);
        const snapshot = await getDoc(sessionRef);

        if (!snapshot.exists()) {
          return null;
        }

        return snapshot.data();
      } catch (error) {
        throw new Error(
          `Failed to find visitor session by ID: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    },

    async findActiveByAnonymousUid(
      anonymousUid: string,
    ): Promise<VisitorSession | null> {
      try {
        // Query for active sessions (not expired, not completed, not failed)
        const activeStatuses = ["capturing", "selecting-theme", "generating"];

        const q = query(
          sessionsCollection,
          where("anonymousUid", "==", anonymousUid),
          where("status", "in", activeStatuses),
          limit(1),
        );

        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          return null;
        }

        return snapshot.docs[0].data();
      } catch (error) {
        throw new Error(
          `Failed to find active session: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    },
  };
};
