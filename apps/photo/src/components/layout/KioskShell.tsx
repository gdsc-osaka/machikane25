import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type KioskShellProps = Readonly<{
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}>;

export const KioskShell = ({
  title,
  description,
  children,
  footer,
}: KioskShellProps) => (
  <main className="flex min-h-screen flex-col bg-neutral-950 text-neutral-50">
    <header className="border-b border-neutral-800 px-8 py-6">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {description ? (
        <p className="mt-2 max-w-3xl text-sm text-neutral-300">{description}</p>
      ) : null}
    </header>
    <section className={cn("flex-1 px-8 py-6", "flex flex-col gap-6")}>
      {children}
    </section>
    {footer ? (
      <footer className="border-t border-neutral-800 px-8 py-4 text-sm text-neutral-400">
        {footer}
      </footer>
    ) : null}
  </main>
);
