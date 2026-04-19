// Single-pass summary of a 1-D P&L sample: mean/SD/CI95, empirical VaR/CVaR,
// loss probability, Sharpe.

import { conditionalVaR, quantile, summarize } from "./risk.ts";

export interface Summary {
  mean: number;
  sd: number;
  stderr: number;
  ci95: number;
  var95: number;
  var99: number;
  cvar95: number;
  cvar99: number;
  probLoss: number;
  sharpe: number | null;
}

export function summarise(samples: ArrayLike<number>): Summary {
  const base = summarize(samples);
  const var95 = -quantile(samples, 0.05);
  const var99 = -quantile(samples, 0.01);
  const cvar95 = conditionalVaR(samples, 0.95);
  const cvar99 = conditionalVaR(samples, 0.99);
  let losses = 0;
  const n = samples.length;
  for (let i = 0; i < n; i++) if ((samples[i] as number) < 0) losses++;
  const probLoss = losses / n;
  const sharpe = base.sd > 0 ? base.mean / base.sd : null;
  return {
    mean: base.mean,
    sd: base.sd,
    stderr: base.stderr,
    ci95: base.ci95,
    var95,
    var99,
    cvar95,
    cvar99,
    probLoss,
    sharpe,
  };
}
