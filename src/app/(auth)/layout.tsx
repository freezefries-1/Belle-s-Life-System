import { Toaster } from "@/components/ui/sonner";

/** Sign-in pages: no sidebar, just a calm centred card. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
      {children}
      <Toaster />
    </main>
  );
}
