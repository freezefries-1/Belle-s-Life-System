import { BrandMark } from "@/components/layout/brand";

/** Branded frame shared by the sign-in screens. */
export function AuthCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="w-full max-w-sm">
      <div className="mb-6 flex items-center gap-2.5">
        <BrandMark />
        <div className="leading-tight">
          <p className="text-[15px] font-bold tracking-tight">belle’s life system</p>
          <p className="text-xs text-muted-foreground">Your life. Your system.</p>
        </div>
      </div>
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <h1 className="text-xl font-bold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-[13px] text-muted-foreground">{description}</p>}
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}
