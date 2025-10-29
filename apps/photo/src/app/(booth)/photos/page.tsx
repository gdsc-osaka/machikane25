"use client";

import { useBoothsWithLatestPhoto } from "@/hooks/useBoothsWithLatestPhoto";

const PhotosPage = () => {
  const { booths, isLoading, error } = useBoothsWithLatestPhoto();

  return (
    <main className="flex min-h-screen flex-col bg-slate-950 px-6 py-12 text-white">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold">Latest Generated Photos</h1>
          <p className="text-sm text-slate-300">
            Download AI-generated photos per booth for Cheki printing.
          </p>
        </header>

        {error ? (
          <p className="rounded-md border border-red-500 bg-red-500/20 px-4 py-3 text-sm text-red-200">
            Failed to load generated photos. Please retry shortly.
          </p>
        ) : null}

        {isLoading ? (
          <p className="text-sm text-slate-300">Loading booths...</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {booths.map((booth) => (
              <article
                key={booth.boothId}
                className="flex flex-col gap-4 rounded-lg border border-slate-800 bg-slate-900 p-4"
              >
                <header className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white">
                    {booth.boothId}
                  </h2>
                  {booth.latestPhoto ? (
                    <span className="text-xs uppercase text-emerald-400">
                      Updated
                    </span>
                  ) : (
                    <span className="text-xs uppercase text-slate-500">
                      Waiting
                    </span>
                  )}
                </header>

                {booth.latestPhoto ? (
                  <>
                    <img
                      src={booth.latestPhoto.imageUrl}
                      alt={`Latest generated photo for ${booth.boothId}`}
                      className="aspect-square w-full rounded-md object-cover"
                    />
                    <footer className="flex items-center justify-between">
                      <p className="text-xs text-slate-400">
                        Photo ID: {booth.latestPhoto.photoId}
                      </p>
                      <a
                        href={booth.latestPhoto.imageUrl}
                        download
                        className="rounded-md bg-emerald-500 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-950 transition hover:bg-emerald-400"
                      >
                        Download for printing
                      </a>
                    </footer>
                  </>
                ) : (
                  <p className="text-sm text-slate-300">
                    No generated photo yet. Please check back soon.
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
};

export default PhotosPage;
