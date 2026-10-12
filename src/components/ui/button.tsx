import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg text-[13px] font-semibold transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-xs hover:bg-primary-hover",
        secondary: "bg-secondary text-secondary-foreground hover:bg-slate-200/70",
        outline:
          "border border-border bg-card text-foreground shadow-xs hover:bg-muted",
        ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
        link: "h-auto px-0 text-primary underline-offset-4 hover:underline",
        ink: "bg-ink-2 text-ink-foreground hover:bg-ink-border/70",
        "ink-ghost": "text-ink-muted hover:bg-ink-2 hover:text-ink-foreground",
      },
      size: {
        default: "h-9 px-3.5",
        sm: "h-8 px-3 text-xs",
        xs: "h-7 rounded-md px-2 text-xs",
        lg: "h-10 px-5",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-xs": "size-7 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
