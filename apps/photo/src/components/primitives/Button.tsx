import { ReactNode } from "react";
import { Button as BaseButton, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost";

export type AppButtonProps = Omit<ButtonProps, "variant"> & Readonly<{
  variant?: ButtonVariant;
  icon?: ReactNode;
}>;

const variantClasses: Readonly<Record<ButtonVariant, string>> = {
  primary: "bg-emerald-500 text-neutral-950 hover:bg-emerald-400",
  secondary: "bg-neutral-200 text-neutral-900 hover:bg-neutral-100",
  ghost: "bg-transparent text-neutral-50 hover:bg-neutral-800",
};

export const Button = ({
  className,
  icon,
  variant = "primary",
  children,
  ...props
}: AppButtonProps) => (
  <BaseButton
    className={cn(
      "gap-2 rounded-full px-6 py-2 text-sm font-semibold transition-colors",
      variantClasses[variant],
      className,
    )}
    {...props}
  >
    {icon ? <span className="h-4 w-4">{icon}</span> : null}
    <span>{children}</span>
  </BaseButton>
);
