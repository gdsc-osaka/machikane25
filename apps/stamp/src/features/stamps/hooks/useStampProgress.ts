"use client";

import useSWR from "swr";
import { swrKeys } from "@/lib/swr/keys";

export type StampProgress = {
	stamps: Array<{
		id: string;
		label: string;
		labelJa?: string;
		labelEn?: string;
		completed: boolean;
	}>;
	remaining: number;
	surveyCompleted: boolean;
	rewardEligible: boolean;
	maintenance?: {
		status: "online" | "degraded" | "maintenance";
		messageJa?: string;
		messageEn?: string;
	};
};

const fetcher = async (input: RequestInfo) => {
	const response = await fetch(input, { cache: "no-store" });
	if (!response.ok) {
		throw new Error("Failed to fetch stamp progress");
	}
	return response.json() as Promise<StampProgress>;
};

export const useStampProgress = () => {
	const { data, error, isLoading, mutate } = useSWR(
		swrKeys.progress(null),
		() => fetcher("/api/stamps/progress"),
		{
			revalidateOnFocus: true,
			refreshInterval: 60_000,
		},
	);

	return {
		data,
		error,
		isLoading,
		refresh: mutate,
	};
};
