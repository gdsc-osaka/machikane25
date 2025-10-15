"use client";

import { doc, getDoc } from "firebase/firestore";
import useSWR from "swr";
import { db } from "@/firebase";

export default function Home() {
	const { data, error, isLoading } = useSWR("doc", () =>
		getDoc(doc(db, "users", "test")),
	);

	return (
		<main className="flex min-h-screen flex-col items-center justify-center p-24">
			<h1 className="text-5xl font-bold mb-8">Stamp</h1>
			{isLoading && <p>Loading...</p>}
			{error && <p>Error: {error.message}</p>}
			{data && <pre>{JSON.stringify(data.data(), null, 2)}</pre>}
		</main>
	);
}
