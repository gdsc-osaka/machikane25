"use client";

import useSWR from "swr";
import { getAquariumSyncErrorsAction } from "@/app/actions/adminActions";
import type { AquariumSyncError } from "@/application/aquariumService";

type SyncErrorWithDate = Omit<AquariumSyncError, "timestamp"> & {
	timestamp: Date;
};

type HookResult = {
	errors: SyncErrorWithDate[];
	isLoading: boolean;
	error: Error | null;
	refresh: () => Promise<SyncErrorWithDate[] | undefined>;
};

const toDate = (value: string): Date => {
	const candidate = new Date(value);
	return Number.isNaN(candidate.getTime()) ? new Date(0) : candidate;
};

const fetchSyncErrors = async (): Promise<AquariumSyncError[]> =>
	getAquariumSyncErrorsAction();

const mapToSyncErrorWithDate = (
	error: AquariumSyncError,
): SyncErrorWithDate => ({
	eventId: error.eventId,
	photoId: error.photoId,
	errorMessage: error.errorMessage,
	issueUrl: error.issueUrl,
	timestamp: toDate(error.timestamp),
});

export const useAquariumSyncErrors = (): HookResult => {
	const swrState = useSWR("aquarium-sync-errors", fetchSyncErrors, {
		refreshInterval: 5000,
	});

	const errors =
		swrState.data?.map(mapToSyncErrorWithDate) ?? ([] as SyncErrorWithDate[]);

	const derivedError =
		swrState.error instanceof Error
			? swrState.error
			: swrState.error
				? new Error("Failed to load aquarium sync errors")
				: null;

	return {
		errors,
		isLoading: swrState.isLoading,
		error: derivedError,
		refresh: async () => {
			const result = await swrState.mutate();
			return result?.map(mapToSyncErrorWithDate);
		},
	};
};
