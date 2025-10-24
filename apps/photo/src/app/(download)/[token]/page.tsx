import { KioskShell } from "@/components/layout/KioskShell";

type DownloadPageProps = {
  params: {
    token: string;
  };
};

const DownloadPage = ({ params }: DownloadPageProps) => (
  <KioskShell
    title="Guest Download"
    description="Access generated portraits for 48 hours, with bilingual instructions for attendees."
  >
    <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-lg border border-neutral-800 bg-neutral-900/40 p-10 text-neutral-400">
      <span className="text-sm uppercase tracking-wide text-violet-300">
        Access Token
      </span>
      <span className="rounded bg-neutral-950 px-3 py-1 font-mono text-base text-neutral-100 shadow-inner shadow-neutral-800">
        {params.token}
      </span>
      <p className="max-w-md text-center text-neutral-400">
        Download experience coming soon. Guests will authenticate with this token to
        preview, share, and save their AI-generated images.
      </p>
    </div>
  </KioskShell>
);

export default DownloadPage;
