import { KioskShell } from "@/components/layout/KioskShell";

const DisplayPage = () => (
  <KioskShell
    title="Attraction Display"
    description="The festival monitor cycles through generated portraits, queue status, and feature announcements."
  >
    <div className="flex flex-1 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-900/40 p-10 text-neutral-400">
      Display rotation experience coming soon.
    </div>
  </KioskShell>
);

export default DisplayPage;
