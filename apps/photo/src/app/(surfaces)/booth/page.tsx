import { KioskShell } from "@/components/layout/KioskShell";

const BoothPage = () => (
  <KioskShell
    title="Booth Capture Surface"
    description="Anonymous visitors authenticate, capture a photo, and choose their Gemini prompt theme."
  >
    <div className="flex flex-1 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-900/40 p-10 text-neutral-400">
      Capture workflow coming soon.
    </div>
  </KioskShell>
);

export default BoothPage;
