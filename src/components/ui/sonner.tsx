"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

function Toaster(props: ToasterProps) {
  return (
    <Sonner
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast:
            "!rounded-xl !border !border-ink-border !bg-ink !text-ink-foreground !shadow-xl !font-sans !text-[13px]",
          description: "!text-ink-muted",
          actionButton: "!bg-primary !text-primary-foreground",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
