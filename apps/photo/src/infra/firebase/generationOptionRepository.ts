/**
 * Infrastructure: GenerationOption Repository
 *
 * Firestore repository for GenerationOption collection
 */

import { getAdminFirestore } from "@/lib/firebase/admin";
import type { GenerationOption } from "@/domain/generationOption";

/**
 * Fetch all generation options from Firestore
 * Uses Firebase Admin SDK (server-side only)
 *
 * @returns Promise resolving to array of GenerationOption
 */
export const fetchAllOptions = async (): Promise<GenerationOption[]> => {
  const firestore = getAdminFirestore();
  const snapshot = await firestore.collection("options").get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      typeId: data.typeId,
      value: data.value,
      displayName: data.displayName,
      imageUrl: data.imageUrl ?? null,
      imagePath: data.imagePath ?? null,
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
    } as GenerationOption;
  });
};
