import { KioskShell } from "@/components/layout/KioskShell";

const AdminPage = () => (
  <KioskShell
    title="Staff Operations Console"
    description="Festival staff review queue state, Remote Config toggles, and water-quality webhooks."
  >
    <div className="flex flex-1 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-900/40 p-10 text-neutral-400">
      Staff dashboard coming soon.
    </div>
  </KioskShell>
);

export default AdminPage;
