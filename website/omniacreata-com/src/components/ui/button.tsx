import type { Route } from "next";
import Link from "next/link";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "md" | "lg";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "border border-[rgba(188,209,229,0.2)] bg-[linear-gradient(135deg,rgba(84,108,137,0.94)_0%,rgba(112,139,170,0.9)_100%)] text-white shadow-[0_24px_64px_rgba(3,10,18,0.28)] hover:-translate-y-0.5 hover:border-[rgba(214,228,241,0.38)] hover:shadow-[0_28px_72px_rgba(3,10,18,0.34)]",
  secondary:
    "border border-white/10 bg-white/[0.045] text-foreground backdrop-blur-md hover:-translate-y-0.5 hover:border-white/[0.18] hover:bg-white/[0.08]",
  ghost:
    "border border-white/8 bg-transparent text-foreground-soft hover:bg-white/[0.04] hover:text-foreground",
};

const sizeClasses: Record<ButtonSize, string> = {
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-sm sm:h-[54px] sm:px-8 sm:text-[15px]",
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
