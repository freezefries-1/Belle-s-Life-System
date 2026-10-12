import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-9 w-full min-w-0 rounded-lg border border-input bg-card px-3 py-1 text-[13px] shadow-xs transition-[color,box-shadow] outline-none placeholder:text-subtle-foreground focus-visible:border-primary/60 focus-visible:ring-[3px] focus-visible:ring-ring/15 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
