import { buildReport, type ModelRow, type Report } from "./report.ts";
import { defaultParams, withOverrides, type Params } from "./params.ts";

const SWEEP_ALPHAS = [0, 0.25, 0.5, 0.75, 1];
const SWEEP_MUS = [-0.1, 0, 0.05, 0.1, 0.2];
const SWEEP_SIGMAS = [0.2, 0.5, 0.8, 1.2];

export interface RowMetrics {
  mean: number;
  sd: number;
  var95: number;
  var99: number;
  cvar95: number;
  cvar99: number;
  probLoss: number;
  sharpe: number | null;
}

export interface SweepCell {
  alpha: number;
  mu: number;
  sigma: number;
  fee: RowMetrics | null;
  b2b: RowMetrics | null;
  matched: RowMetrics | null;
  partial: RowMetrics | null;
  drawdown: Report["drawdown"];
  QStar: number;
}

export interface SweepArtifact {
  grid: { alphas: number[]; mus: number[]; sigmas: number[] };
  base: Params;
  cells: SweepCell[];
}

function extractRowMetrics(rows: ModelRow[], name: string): RowMetrics | null {
  const r = rows.find((x) => x.name === name);
  if (!r) return null;
  return {
    mean: r.mcMean,
    sd: r.mcSd,
    var95: r.var95,
    var99: r.var99,
    cvar95: r.cvar95,
    cvar99: r.cvar99,
    probLoss: r.probLoss,
    sharpe: r.sharpe,
  };
}

export function runSweep(
  opts: { overrides?: Partial<Params> } = {},
): SweepArtifact {
  const baseParams = withOverrides(defaultParams, opts.overrides ?? {});
  const sweepParams = withOverrides(baseParams, { nPaths: 20_000, nSteps: 100 });
  const cells: SweepCell[] = [];
  for (const alpha of SWEEP_ALPHAS) {
    for (const mu of SWEEP_MUS) {
      for (const sigma of SWEEP_SIGMAS) {
        const p = withOverrides(sweepParams, { alpha, mu, sigma });
        const r = buildReport(p, { keepPaths: 0, traceSize: 0, histBins: 40 });
        cells.push({
          alpha,
          mu,
          sigma,
          fee: extractRowMetrics(r.rows, "fee"),
          b2b: extractRowMetrics(r.rows, "principal_3b"),
          matched: extractRowMetrics(r.rows, "principal_3a"),
          partial: extractRowMetrics(r.rows, "principal_3c"),
          drawdown: r.drawdown,
          QStar: r.closed.QStar,
        });
      }
    }
  }
  return {
    grid: { alphas: SWEEP_ALPHAS, mus: SWEEP_MUS, sigmas: SWEEP_SIGMAS },
    base: sweepParams,
    cells,
  };
}
