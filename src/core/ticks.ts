// Calendar-ish tick helpers for the OJS horizon axes. `tickStep` picks the
// span (whole weeks up to 60 days, whole months up to 2 years, whole years
// beyond), and the other helpers agree by construction so axes and date
// labels never drift.

export function tickStep(tdays: number): number {
  if (tdays <= 60) return 7;
  if (tdays <= 730) return 30;
  return 365;
}

export function xTicksForHorizon(tdays: number): number[] {
  const step = tickStep(tdays);
  const ticks: number[] = [];
  for (let d = 0; d <= tdays; d += step) ticks.push(d);
  return ticks;
}

export function xTicksAnchoredRight(tdays: number): number[] {
  const step = tickStep(tdays);
  const ticks: number[] = [];
  for (let d = tdays; d >= 0; d -= step) ticks.push(d);
  return ticks.reverse();
}

export function formatTickDate(date: Date, tdays: number): string {
  const step = tickStep(tdays);
  if (step === 7) {
    return date.toLocaleString("en-US", { month: "short", day: "numeric" });
  }
  if (step === 30) {
    return date.toLocaleString("en-US", { month: "short", year: "2-digit" });
  }
  return date.toLocaleString("en-US", { year: "numeric" });
}
