"use client";

import { cn } from "@/lib/utils";

type RevealProps = {
  children: React.ReactNode;
  className?: string;
  delay?: number;
};

export function Reveal({ children, className, delay = 0 }: RevealProps) {
  return (
    <div className={cn(className)} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}
