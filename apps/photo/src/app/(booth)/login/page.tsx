"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { initializeFirebaseClient } from "@/lib/firebase/client";
import { getAuth,  signInWithCustomToken } from "firebase/auth";
import { loginWithAdminTokenAction } from "@/app/actions/authActions";

const LoginPage = () => {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    startTransition(async () => {
      try {
        const { customToken } = await loginWithAdminTokenAction({ token });
        await initializeFirebaseClient();
        const auth = getAuth();
        await signInWithCustomToken(auth, customToken);
        router.push("/admin");
      } catch (error) {
        console.error("Failed to authenticate admin token", error);
        setErrorMessage("Failed to authenticate admin token");
      }
    });
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-6 py-12 text-white">
      <section className="w-full max-w-md rounded-xl bg-slate-900 p-8 shadow-lg">
        <header className="mb-6 text-center">
          <h1 className="text-3xl font-semibold tracking-wide">Admin Login</h1>
          <p className="mt-2 text-sm text-slate-300">
            Enter the admin token to access management tools.
          </p>
        </header>
        <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-2">
            <label
              className="text-sm font-medium text-slate-200"
              htmlFor="admin-token"
            >
              Admin Token
            </label>
            <input
              id="admin-token"
              type="password"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-base text-white outline-none ring-offset-2 focus:border-slate-500 focus:ring-2 focus:ring-slate-400"
              autoComplete="current-password"
              required
            />
          </div>
          {errorMessage ? (
            <p className="text-sm text-red-400" role="alert">
              {errorMessage}
            </p>
          ) : null}
          <button
            type="submit"
            className="w-full rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
            disabled={isPending || token.length === 0}
          >
            {isPending ? "Logging in..." : "Log in"}
          </button>
        </form>
      </section>
    </main>
  );
};

export default LoginPage;
