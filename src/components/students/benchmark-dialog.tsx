"use client";

import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UNIT_LABELS, availableTests, customTestKey, formatBenchmark } from "@/lib/students/performance";
import { useWorkspace } from "@/lib/store/workspace-store";
import type { BenchmarkUnit, Student, StudentBenchmark } from "@/types";

import { ChoiceGroup } from "./student-visuals";

const NEW = "__new__";

/** Record (or edit) one benchmark result: pick a test — or name your own — and enter the number. */
export function BenchmarkDialog({
  student,
  result,
  initialTest,
  open,
  onOpenChange,
}: {
  student: Student;
  result?: StudentBenchmark;
  initialTest?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { workspace, actions } = useWorkspace();
  const tests = availableTests(workspace.studentBenchmarks);
  const [test, setTest] = React.useState(result?.test ?? initialTest ?? tests[0].test);
  const [newName, setNewName] = React.useState("");
  const [newUnit, setNewUnit] = React.useState<BenchmarkUnit>("count");
  const [higherIsBetter, setHigherIsBetter] = React.useState(true);
  const [value, setValue] = React.useState(result ? String(result.value) : "");
  const [measuredOn, setMeasuredOn] = React.useState(result?.measuredOn ?? workspace.today);
  const [note, setNote] = React.useState(result?.note ?? "");

  const creating = test === NEW;
  const chosen = tests.find((t) => t.test === test) ?? (result ? { test: result.test, name: result.name, unit: result.unit, higherIsBetter: result.higherIsBetter } : undefined);
  const unit = creating ? newUnit : (chosen?.unit ?? "count");
  const number = value.trim() === "" ? NaN : Number(value.replace(",", "."));
  const max = unit === "out_of_10" ? 10 : 100000;
  const numberOk = Number.isFinite(number) && number >= 0 && number <= max && (unit !== "out_of_10" && unit !== "balls" ? true : Number.isInteger(number));
  const nameOk = !creating || newName.trim().length > 0;
  const valid = numberOk && nameOk && !!measuredOn;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    const input = creating
      ? { test: customTestKey(newName), name: newName.trim(), unit: newUnit, higherIsBetter, value: number, measuredOn, note }
      : { test: chosen!.test, name: chosen!.name, unit: chosen!.unit, higherIsBetter: chosen!.higherIsBetter, value: number, measuredOn, note };
    if (result) {
      actions.updateBenchmark(result.id, input);
      toast("Result saved", { description: `${input.name}: ${formatBenchmark(input.unit, input.value)}` });
    } else if (actions.addBenchmark(student.id, input)) {
      toast("Result recorded", { description: `${input.name}: ${formatBenchmark(input.unit, input.value)}` });
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-4 max-h-[calc(100dvh-2rem)] max-w-lg overflow-y-auto sm:top-[8%] sm:max-h-[88dvh]">
        <DialogHeader>
          <DialogTitle>
            {result ? "Edit result" : "Record a result"}: {student.name}
          </DialogTitle>
          <DialogDescription>Repeat the same test every few weeks to see the trend.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor="bench-test">Test</Label>
            <Select value={test} onValueChange={setTest} disabled={!!result}>
              <SelectTrigger id="bench-test" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {tests.map((t) => (
                  <SelectItem key={t.test} value={t.test}>
                    {t.name}
                  </SelectItem>
                ))}
                {!result && <SelectItem value={NEW}>New test…</SelectItem>}
              </SelectContent>
            </Select>
          </div>
          {creating && (
            <div className="flex flex-col gap-4 rounded-lg border px-3.5 py-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="bench-name">Name of your test</Label>
                <Input id="bench-name" autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Spider drill" maxLength={80} autoComplete="off" />
              </div>
              <ChoiceGroup
                legend="Measured as"
                name="bench-unit"
                value={newUnit}
                onChange={(u) => {
                  setNewUnit(u);
                  setHigherIsBetter(u !== "seconds");
                }}
                options={(Object.keys(UNIT_LABELS) as BenchmarkUnit[]).map((u) => ({ value: u, label: UNIT_LABELS[u] }))}
              />
              <ChoiceGroup
                legend="Better is"
                name="bench-direction"
                value={higherIsBetter ? "higher" : "lower"}
                onChange={(v) => setHigherIsBetter(v === "higher")}
                options={[
                  { value: "higher", label: "Higher" },
                  { value: "lower", label: "Lower (e.g. a time)" },
                ]}
              />
            </div>
          )}
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="bench-value">{unit === "out_of_10" ? "Out of 10" : unit === "balls" ? "Balls" : unit === "seconds" ? "Seconds" : "Result"}</Label>
              <Input
                id="bench-value"
                inputMode={unit === "seconds" ? "decimal" : "numeric"}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                aria-invalid={value.trim() !== "" && !numberOk}
                className="w-28"
                autoComplete="off"
              />
            </div>
            <p className="pb-2 text-[13px] font-semibold tabular-nums" aria-live="polite">
              {numberOk && unit === "out_of_10" ? `${Math.round(number * 10)}%` : ""}
            </p>
            <div className="flex flex-col gap-2">
              <Label htmlFor="bench-date">Date</Label>
              <Input id="bench-date" type="date" value={measuredOn} max={workspace.today} onChange={(e) => setMeasuredOn(e.target.value)} className="w-44" />
            </div>
          </div>
          {value.trim() !== "" && !numberOk && (
            <p role="alert" className="text-xs text-rose-700">
              {unit === "out_of_10" ? "Enter a whole number from 0 to 10." : unit === "balls" ? "Enter a whole number of balls." : "Enter a number."}
            </p>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="bench-note">Note (optional)</Label>
            <Input id="bench-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. windy day" maxLength={200} autoComplete="off" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!valid}>
              {result ? "Save result" : "Record result"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
