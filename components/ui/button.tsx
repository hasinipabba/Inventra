import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
}

export function Button({ className, variant = "secondary", size = "md", ...props }: ButtonProps) {
  const base = "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50 disabled:pointer-events-none";
  const sizes = { sm: "h-8 px-3 text-xs", md: "h-9 px-3.5 text-sm" };
  const variants = {
    primary: "bg-primary text-primary-foreground hover:opacity-90",
    secondary: "bg-surface2 text-text hover:bg-border/60 border border-border",
    ghost: "text-muted hover:text-text hover:bg-surface2",
    danger: "bg-out/10 text-out hover:bg-out/20",
  };
  return <button className={cn(base, sizes[size], variants[variant], className)} {...props} />;
}
