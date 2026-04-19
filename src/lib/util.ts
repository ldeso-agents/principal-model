// Calendar-ish tick step in days — whole weeks up to 60 days, whole months
// up to 2 years, then whole years. Shared by the two tick functions and by
// formatTickDate so the three always agree.
export function tickStep(tdays: number): number {
  if (tdays <= 60) return 7;
  if (tdays <= 730) return 30;
  return 365;
}

// Pick calendar-ish tick positions (in days) so the x-axis steps in
// whole weeks / months / years depending on the horizon, rather than
// rescaling to a fixed number of evenly-spaced ticks.
export function xTicksForHorizon(tdays: number): number[] {
  const step = tickStep(tdays);
  const ticks: number[] = [];
  for (let d = 0; d <= tdays; d += step) ticks.push(d);
  return ticks;
}

// Same step logic as xTicksForHorizon but anchored on the right edge
// (day = tdays) rather than zero.
export function xTicksAnchoredRight(tdays: number): number[] {
  const step = tickStep(tdays);
  const ticks: number[] = [];
  for (let d = tdays; d >= 0; d -= step) ticks.push(d);
  return ticks.reverse();
}

// Render a date at a resolution appropriate for the horizon it sits on.
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
