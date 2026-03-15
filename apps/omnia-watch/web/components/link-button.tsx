import Link, { type LinkProps } from "next/link";
import type { AnchorHTMLAttributes } from "react";
import { buttonVariants, type ButtonProps } from "@omnia-watch/ui";
import { cn } from "@omnia-watch/utils";

type LinkButtonProps = LinkProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> &
  Pick<ButtonProps, "size" | "variant">;

export function LinkButton({
  children,
  className,
  size,
  variant,
  ...props
}: LinkButtonProps) {
  return (
    <Link className={cn(buttonVariants({ size, variant }), className)} {...props}>
      {children}
    </Link>
  );
}
