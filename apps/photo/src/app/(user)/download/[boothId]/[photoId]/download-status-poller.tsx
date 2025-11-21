"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Progress } from "@/components/ui/progress";

export const DownloadStatusPoller = () => {
	const router = useRouter();

	useEffect(() => {
		const interval = setInterval(() => {
			router.refresh();
		}, 3000);

		return () => clearInterval(interval);
	}, [router]);

	return (
		<main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background px-6 py-16 text-center">
			<h1 className="text-3xl font-semibold animate-pulse">
				Generating your photo...
			</h1>
			<p className="max-w-md text-muted-foreground">
				Please wait a moment while our AI creates your masterpiece.
			</p>
			<Progress value={undefined} className="w-64" />
		</main>
	);
};
