import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export default function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        "surface rounded-2xl p-5 transition-all duration-200",
        className,
      )}
    >
      {children}
    </div>
  );
}
