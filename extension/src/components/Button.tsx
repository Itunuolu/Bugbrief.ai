import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";

type ButtonVariant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode;
  isLoading?: boolean;
  variant?: ButtonVariant;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-slate-900 text-white shadow-soft hover:bg-slate-800 focus-visible:ring-slate-500",
  secondary:
    "border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 focus-visible:ring-teal-500",
  ghost:
    "bg-transparent text-slate-700 hover:bg-slate-100 focus-visible:ring-teal-500"
};

export function Button({
  children,
  className = "",
  disabled,
  icon,
  isLoading = false,
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      className={[
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
        variantClasses[variant],
        className
      ].join(" ")}
      disabled={disabled || isLoading}
      type={type}
      {...props}
    >
      {isLoading ? <Loader2 className="animate-spin" size={18} /> : icon}
      <span>{children}</span>
    </button>
  );
}
