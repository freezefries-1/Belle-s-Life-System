"use client";

import * as React from "react";
import { Database, FileInput, Lock } from "lucide-react";

import { DataSettings } from "@/components/settings/data-settings";
import { PageHeader } from "@/components/shared/page-header";
import { SprintDot } from "@/components/shared/sprint-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { SPRINTS } from "@/data/sprints";
import { cn } from "@/lib/utils";

export function SettingsPage() {
  const [theme, setTheme] = React.useState("light");

  return (
    <>
      <PageHeader
        title="Preferences"
        description="Shape the system around how you work. Data controls work now; the other preferences are previews."
        actions={
          <Button disabled title="Saving preferences arrives in a later phase">
            Save changes
          </Button>
        }
      />

      <div className="flex max-w-3xl flex-col gap-5">
        <SettingsSection title="Profile" description="How the app greets you.">
          <Field label="Display name" htmlFor="name">
            <Input id="name" defaultValue="Belle" className="max-w-xs" />
          </Field>
        </SettingsSection>

        <SettingsSection title="Appearance" description="Calm by default.">
          <Field label="Theme">
            <div className="inline-flex rounded-lg bg-muted p-1" role="radiogroup" aria-label="Theme">
              {[
                { id: "light", label: "Light" },
                { id: "dark", label: "Dark", soon: true },
                { id: "system", label: "System", soon: true },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={theme === t.id}
                  disabled={t.soon}
                  onClick={() => setTheme(t.id)}
                  className={cn(
                    "h-7 cursor-pointer rounded-md px-3 text-xs font-semibold text-muted-foreground transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                    theme === t.id && "bg-card text-foreground shadow-sm",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </Field>
          <ToggleField id="reduce-motion" label="Reduce motion" description="Fewer transitions and animations." />
          <ToggleField id="compact" label="Compact task rows" description="Fit more on screen when you need to." />
        </SettingsSection>

        <SettingsSection title="Day & rhythm" description="Time awareness, without pressure.">
          <Field label="Week starts on">
            <Select defaultValue="monday">
              <SelectTrigger className="w-40" aria-label="Week starts on">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monday">Monday</SelectItem>
                <SelectItem value="sunday">Sunday</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Default focus session">
            <Select defaultValue="25">
              <SelectTrigger className="w-40" aria-label="Default focus session">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["15", "25", "45", "60"].map((m) => (
                  <SelectItem key={m} value={m}>
                    {m} minutes
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Shutdown reminder" htmlFor="shutdown">
            <Input id="shutdown" type="time" defaultValue="23:30" className="w-40" />
          </Field>
          <ToggleField id="carry" label="Carry over unfinished tasks" description="Quietly move yesterday’s open tasks into today." defaultChecked />
        </SettingsSection>

        <SettingsSection title="Sprints" description="The four kinds of work. Renaming arrives in a later phase.">
          <ul className="flex flex-col divide-y rounded-lg border">
            {SPRINTS.map((s) => (
              <li key={s.id} className="flex items-center gap-3 px-3.5 py-2.5 text-[13px]">
                <SprintDot sprintId={s.id} />
                <span className="font-semibold">Sprint {s.number}</span>
                <span className="text-muted-foreground">{s.name}</span>
              </li>
            ))}
          </ul>
        </SettingsSection>

        <SettingsSection title="Your data" description="Tasks and Brain Dump entries.">
          <DataSettings />
        </SettingsSection>

        <SettingsSection title="Integrations" description="Coming in later phases.">
          {[
            { icon: Database, title: "Cloud sync", body: "Save everything securely and use it on any device." },
            { icon: Lock, title: "Sign in", body: "A private, password-protected workspace." },
            { icon: FileInput, title: "Import from Notion", body: "Bring over your existing Kaizen entries." },
          ].map((i) => (
            <div key={i.title} className="flex items-center gap-3 rounded-lg border border-dashed px-3.5 py-3">
              <i.icon className="size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold">{i.title}</p>
                <p className="text-xs text-muted-foreground">{i.body}</p>
              </div>
              <Badge variant="secondary">Later</Badge>
            </div>
          ))}
        </SettingsSection>
      </div>
    </>
  );
}

function SettingsSection({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <Card className="grid grid-cols-1 gap-5 p-5 md:grid-cols-[200px_minmax(0,1fr)] md:p-6">
      <div>
        <h3 className="text-[15px] font-semibold">{title}</h3>
        <p className="mt-0.5 text-[13px] text-muted-foreground">{description}</p>
      </div>
      <div className="flex flex-col gap-5">{children}</div>
    </Card>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

function ToggleField({
  id,
  label,
  description,
  defaultChecked,
}: {
  id: string;
  label: string;
  description: string;
  defaultChecked?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <Label htmlFor={id}>{label}</Label>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch id={id} defaultChecked={defaultChecked} />
    </div>
  );
}
