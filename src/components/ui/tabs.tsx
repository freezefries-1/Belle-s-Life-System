"use client";

import * as React from "react";
import { Tabs as TabsPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root data-slot="tabs" className={cn("flex flex-col gap-3", className)} {...props} />;
}

function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "inline-flex h-9 w-fit max-w-full items-center gap-0.5 overflow-x-auto rounded-lg bg-muted p-1 text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

/**
 * `standalone`: the tabs switch or filter content rendered elsewhere (no
 * TabsContent), so the trigger doesn't point screen readers at a panel that
 * doesn't exist.
 */
function TabsTrigger({ className, standalone, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger> & { standalone?: boolean }) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      {...(standalone ? { "aria-controls": undefined } : {})}
      className={cn(
        "inline-flex h-full cursor-pointer items-center justify-center gap-1.5 rounded-md px-3 text-xs font-semibold whitespace-nowrap transition-colors outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content data-slot="tabs-content" className={cn("outline-none", className)} {...props} />;
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
