import type { Route } from "next";
import Link from "next/link";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "md" | "lg";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "border border-[rgba(216,181,109,0.55)] bg-[linear-gradient(135deg,#f0ca74_0%,#c79843_100%)] text-[#15110a] shadow-[0_22px_58px_rgba(216,181,109,0.2)] hover:-translate-y-0.5 hover:border-[rgba(243,223,174,0.75)] hover:shadow-[0_28px_72px_rgba(216,181,109,0.24)]",
  secondary:
    "border border-[rgba(216,181,109,0.38)] bg-transparent text-foreground backdrop-blur-md hover:-translate-y-0.5 hover:border-[rgba(243,223,174,0.58)] hover:bg-white/[0.05]",
  ghost:
    "border border-transparent bg-transparent px-0 text-accent hover:text-accent-strong",
};

const sizeClasses: Record<ButtonSize, string> = {
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-sm sm:h-[54px] sm:px-8 sm:text-[15px]",
};

function buttonClasses(variant: ButtonVariant, size: ButtonSize, className?: string) {
  return cn(
    "inline-flex items-center justify-center rounded-full font-medium transition duration-300",
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
