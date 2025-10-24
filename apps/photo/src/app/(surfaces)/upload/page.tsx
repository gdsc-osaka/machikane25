import { KioskShell } from "@/components/layout/KioskShell";

const UploadPage = () => (
  <KioskShell
    title="Mobile Upload Portal"
    description="Guests scan a QR code to upload an image and opt into Gemini generation remotely."
  >
    <div className="flex flex-1 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-900/40 p-10 text-neutral-400">
      Mobile upload onboarding coming soon.
    </div>
  </KioskShell>
);

export default UploadPage;
