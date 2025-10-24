import Link from "next/link";

const sections = [
  {
    href: "/booth",
    label: "Kiosk Capture",
    description: "Start anonymous sessions and capture photos on the booth device.",
  },
  {
    href: "/display",
    label: "Live Display",
    description: "Showcase generated portraits on the attraction monitor.",
  },
  {
    href: "/upload",
    label: "Mobile Uploader",
    description: "Allow guests to upload selfies for AI generation.",
  },
  {
    href: "/download",
    label: "Guest Download",
    description: "Provide personal QR access to generated portraits.",
  },
  {
    href: "/admin",
    label: "Staff Console",
    description: "Monitor queue health, remote config, and incident status.",
  },
] as const;

const Home = () => (
  <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-10 px-8 py-16">
    <header className="space-y-4">
      <p className="text-sm uppercase tracking-[0.3em] text-neutral-800">
        AI Photo Booth
      </p>
      <h1 className="text-4xl font-semibold tracking-tight text-black dark:text-white">
        Photo
      </h1>
      <p className="text-xl font-medium tracking-tight text-neutral-200">
        Experience Surface Directory
      </p>
      <p className="max-w-2xl text-neutral-400">
        Explore the kiosk, guest, and staff surfaces that power the Gemini-backed
        photo experience. Each route lives under the shared (surfaces) App Router group.
      </p>
    </header>
    <section className="grid gap-4 md:grid-cols-2">
      {sections.map((section) => (
        <Link
          key={section.href}
          href={section.href}
          className="rounded-lg border border-neutral-800 bg-neutral-950/70 p-6 transition hover:border-neutral-600 hover:bg-neutral-900"
        >
          <span className="text-sm font-medium uppercase tracking-wide text-violet-300">
            {section.label}
          </span>
          <p className="mt-3 text-sm text-neutral-400">{section.description}</p>
        </Link>
      ))}
    </section>
  </main>
);

export default Home;
