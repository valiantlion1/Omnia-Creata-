import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@omnia-watch/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-full px-4 py-2.5 text-sm font-semibold transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-50",
  {
    defaultVariants: {
      size: "md",
      variant: "primary"
    },
    variants: {
      size: {
        md: "h-11 gap-2",
        sm: "h-9 gap-1.5 px-3 text-xs",
        lg: "h-12 gap-2.5 px-5 text-base"
      },
      variant: {
        ghost: "border border-transparent bg-transparent text-text hover:bg-surface/70",
        outline: "border border-line/80 bg-transparent text-text hover:border-accent/50 hover:bg-surface/70",
        primary: "bg-accent text-canvas shadow-glow hover:bg-accent/90",
        secondary: "border border-line/70 bg-surface/90 text-text hover:bg-panel"
      }
    }
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, size, variant, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ size, variant }), className)} {...props} />;
}
