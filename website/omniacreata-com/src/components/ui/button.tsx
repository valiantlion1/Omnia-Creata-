import type { Route } from "next";
import Link from "next/link";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "md" | "lg";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "border border-[rgba(217,181,109,0.3)] bg-[linear-gradient(135deg,#f1d89f_0%,#d0a95e_45%,#9f7741_100%)] text-black shadow-[0_20px_50px_rgba(217,181,109,0.22)] hover:-translate-y-0.5 hover:shadow-[0_24px_60px_rgba(217,181,109,0.28)]",
  secondary:
    "border border-white/10 bg-white/[0.04] text-foreground hover:-translate-y-0.5 hover:border-[rgba(217,181,109,0.24)] hover:bg-white/[0.07]",
  ghost:
    "border border-transparent bg-transparent text-foreground-soft hover:bg-white/[0.05] hover:text-foreground",
};

const sizeClasses: Record<ButtonSize, string> = {
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-sm sm:h-[52px] sm:px-7 sm:text-[15px]",
};

function buttonClasses(variant: ButtonVariant, size: ButtonSize, className?: string) {
  return cn(
    "inline-flex items-center justify-center rounded-full font-medium tracking-[-0.01em] transition duration-300",
    variantClasses[variant],
    sizeClasses[size],
    className,
  );
}

type ButtonLinkProps = {
  href: string;
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
};

export function ButtonLink({
  href,
  children,
  variant = "primary",
  size = "md",
  className,
}: ButtonLinkProps) {
  const classes = buttonClasses(variant, size, className);

  if (!href.startsWith("/")) {
    return (
      <a className={classes} href={href}>
        {children}
      </a>
    );
  }

  return (
    <Link className={classes} href={href as Route}>
      {children}
    </Link>
  );
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({
  children,
  className,
  variant = "primary",
  size = "md",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button className={buttonClasses(variant, size, className)} type={type} {...props}>
      {children}
    </button>
  );
}
