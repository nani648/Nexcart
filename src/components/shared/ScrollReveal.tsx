import type { ReactNode } from "react";

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export function ScrollReveal({ children, className = "" }: ScrollRevealProps) {
  return (
    <div className={className}>
      {children}
    </div>
  );
}
