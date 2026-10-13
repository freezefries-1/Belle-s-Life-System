"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

function Toaster(props: ToasterProps) {
  return (
    <Sonner
      position="bottom-right"
      // Above the phone/tablet bottom bar (see --toast-bottom in globals.css).
      offset={{ bottom: "var(--toast-bottom)", right: 24 }}
      mobileOffset={{ bottom: "var(--toast-bottom)", left: 16, right: 16 }}
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
