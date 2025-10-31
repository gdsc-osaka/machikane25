"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useMemo, useState, useTransition } from "react";
import { retryAquariumSyncAction } from "@/app/actions/adminActions";
import { useAquariumSyncErrors } from "@/hooks/useAquariumSyncErrors";

const AdminPage = () => {
	const router = useRouter();
	const { errors, isLoading, error, refresh } = useAquariumSyncErrors();
	const [boothId, setBoothId] = useState("");
	const [isPending, startTransition] = useTransition();

	const navigationLinks = useMemo(
		() => [
			{
				href: (boothId ? `/control/${boothId}` : "/control") as Route,
				label: "Control",
			},
			{
				href: (boothId ? `/display/${boothId}` : "/display") as Route,
				label: "Display",
			},
			{
				href: (boothId ? `/photos?booth=${boothId}` : "/photos") as Route,
				label: "Photos",
			},
		],
		[boothId],
	);

	const handleRetry = (eventId: string, photoId: string, issueUrl: string) => {
		startTransition(async () => {
			await retryAquariumSyncAction({ eventId, photoId, issueUrl });
			await refresh();
			router.refresh();
		});
	};

	const handleBoothIdChange = (event: FormEvent<HTMLInputElement>) => {
		const target = event.target;
		if (target instanceof HTMLInputElement) {
			setBoothId(target.value.trim());
		}
	};

	return (
		<main className="flex min-h-screen flex-col gap-8 bg-slate-950 px-6 py-12 text-white">
			<section className="mx-auto flex w-full max-w-4xl flex-col gap-6">
				<header>
					<h1 className="text-3xl font-semibold">Admin Dashboard</h1>
					<p className="mt-2 text-sm text-slate-300">
						Monitor booth status, navigate to device pages, and retry Aquarium
						sync requests.
					</p>
				</header>

				<div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
					<form className="flex flex-col gap-4">
						<label
							className="flex flex-col gap-2 text-sm font-medium"
							htmlFor="booth-id"
						>
							Booth ID
							<input
								id="booth-id"
								value={boothId}
								onInput={handleBoothIdChange}
								placeholder="Enter booth identifier"
								className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none ring-offset-2 focus:border-slate-500 focus:ring-2 focus:ring-slate-400"
							/>
						</label>
						<nav className="flex flex-wrap gap-3">
							{navigationLinks.map((link) => (
								<Link
									key={link.label}
									href={link.href}
									className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-slate-950 transition hover:bg-emerald-400"
								>
									{link.label}
								</Link>
							))}
						</nav>
					</form>
				</div>

				<section className="rounded-lg border border-slate-800 bg-slate-900 p-6">
					<header className="mb-4 flex items-center justify-between">
						<h2 className="text-xl font-semibold">Aquarium Sync Failures</h2>
						<span className="text-xs uppercase text-slate-400">
							{isPending ? "Retrying..." : isLoading ? "Loading..." : "Live"}
						</span>
					</header>

					{error ? (
						<p className="text-sm text-red-400">
							Failed to load aquarium sync errors. Please try again later.
						</p>
					) : errors.length === 0 ? (
						<p className="text-sm text-slate-300">No failures reported.</p>
					) : (
						<div className="overflow-x-auto">
							<table className="min-w-full divide-y divide-slate-800 text-left text-sm">
								<thead className="bg-slate-900/60 text-slate-300">
									<tr>
										<th className="px-4 py-2 font-medium">Photo ID</th>
										<th className="px-4 py-2 font-medium">Error</th>
										<th className="px-4 py-2 font-medium">Timestamp</th>
										<th className="px-4 py-2 font-medium">Sentry</th>
										<th className="px-4 py-2 font-medium">Action</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-slate-800">
									{errors.map((syncError) => (
										<tr key={syncError.eventId}>
											<td className="px-4 py-3 font-mono text-slate-100">
												{syncError.photoId}
											</td>
											<td className="px-4 py-3 text-slate-200">
												{syncError.errorMessage}
											</td>
											<td className="px-4 py-3 text-slate-300">
												{syncError.timestamp.toISOString()}
											</td>
											<td className="px-4 py-3">
												<Link
													href={syncError.issueUrl as Route}
													target="_blank"
													rel="noreferrer"
													className="text-emerald-400 underline"
												>
													View Issue
												</Link>
											</td>
											<td className="px-4 py-3">
												<button
													type="button"
													className="rounded-md bg-emerald-500 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
													disabled={isPending}
													onClick={() =>
														handleRetry(
															syncError.eventId,
															syncError.photoId,
															syncError.issueUrl,
														)
													}
												>
													Retry
												</button>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</section>
			</section>
		</main>
	);
};

export default AdminPage;
