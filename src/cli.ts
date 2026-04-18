import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { buildReport } from "./report.ts";
import { closedForm } from "./models.ts";
import type { Params } from "./params.ts";
import { defaultParams, withOverrides } from "./params.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(HERE, "..", "report", "data");

const FLAG_TO_PARAM: Record<string, keyof Params> = {
  seed: "seed",
  paths: "nPaths",
  steps: "nSteps",
  alpha: "alpha",
  mu: "mu",
  sigma: "sigma",
  Q: "Q",
  f: "f",
  T: "T",
};

interface CliArgs {
  overrides: Partial<Params>;
  sweep: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const overrides: Partial<Params> = {};
  let sweep = false;
  for (let i = 0; i < argv.length; i++) {
    const tok = argv[i];
    if (tok === "--sweep") {
      sweep = true;
      continue;
    }
    if (!tok || !tok.startsWith("--")) continue;
    const key = tok.slice(2);
    const val = argv[++i];
    if (val === undefined) throw new Error(`missing value for --${key}`);
    const field = FLAG_TO_PARAM[key];
    if (!field) throw new Error(`unknown flag --${key}`);
    overrides[field] = Number(val);
  }
  return { overrides, sweep };
}

function fmt(x: number, digits = 3): string {
  if (!isFinite(x)) return String(x);
  if (x === 0) return "0";
  const abs = Math.abs(x);
  if (abs >= 1e6 || abs < 1e-3) return x.toExponential(digits);
  return x.toFixed(digits);
}

function printMainTable(params: Params): ReturnType<typeof buildReport> {
  const report = buildReport(params, { keepPaths: 25 });

  console.log(`\nParameters`);
  console.log(
    `  S0=${params.S0}  μ=${params.mu}  σ=${params.sigma}  T=${params.T}` +
      `  P=${params.P}  λ=${params.lambda}  f=${params.f}  Q=${params.Q}` +
      `  α=${params.alpha}  N_paths=${params.nPaths}  N_steps=${params.nSteps}` +
      `  seed=${params.seed}`,
  );

  console.log(`\n§4 — P&L moments, closed-form vs MC`);
  console.log(
    "  model          E[Π] (cf)     E[Π] (mc)     ±CI95          SD (cf)       SD (mc)       z",
  );
  for (const r of report.rows) {
    console.log(
      `  ${r.name.padEnd(14)}` +
        ` ${fmt(r.closedFormMean).padStart(12)}` +
        ` ${fmt(r.mcMean).padStart(12)}` +
        ` ${("±" + fmt(r.mcCi95)).padStart(14)}` +
        ` ${fmt(r.closedFormSd).padStart(12)}` +
        ` ${fmt(r.mcSd).padStart(12)}` +
        ` ${fmt(r.zScore, 2).padStart(6)}`,
    );
  }

  console.log(`\n§4 — Tail risk (Monte Carlo)`);
  console.log(
    "  model          VaR95         VaR99         CVaR95        CVaR99        P[Π<0]    Sharpe",
  );
  for (const r of report.rows) {
    console.log(
      `  ${r.name.padEnd(14)}` +
        ` ${fmt(r.var95).padStart(12)}` +
        ` ${fmt(r.var99).padStart(12)}` +
        ` ${fmt(r.cvar95).padStart(12)}` +
        ` ${fmt(r.cvar99).padStart(12)}` +
        ` ${fmt(r.probLoss).padStart(8)}` +
        ` ${(r.sharpe === null ? "—" : fmt(r.sharpe, 3)).padStart(8)}`,
    );
  }

  console.log(
    `\n§3a — NAV drawdown  mean=${fmt(report.drawdown.mean)}` +
      `  sd=${fmt(report.drawdown.sd)}` +
      `  q95=${fmt(report.drawdown.var95)}` +
      `  q99=${fmt(report.drawdown.var99)}` +
      `  max=${fmt(report.drawdown.max)}`,
  );

  console.log(`\n§5 — Break-even quote  Q* = ${fmt(report.closed.QStar, 4)}`);
  console.log(
    `     E[R_fee] = ${fmt(report.closed.fee.mean)}` +
      `   E[Π_b2b]|Q=Q* = ${fmt(
        report.closed.QStar * report.closed.N -
          params.P * params.lambda * report.closed.IT.mean,
      )}`,
  );
  console.log(
    `\n     Sanity: E[S_T] closed=${fmt(report.terminalSCheck.closedForm)}` +
      `  mc=${fmt(report.terminalSCheck.mcMean)}` +
      `  z=${fmt(report.terminalSCheck.zScore, 2)}`,
  );

  return report;
}

// Sweep grid driving the Observable report's sliders; fewer paths for speed.
const SWEEP_ALPHAS = [0, 0.25, 0.5, 0.75, 1];
const SWEEP_MUS = [-0.1, 0, 0.05, 0.1, 0.2];
const SWEEP_SIGMAS = [0.2, 0.5, 0.8, 1.2];

function runSweep(baseParams: Params): unknown {
  const sweepParams = withOverrides(baseParams, { nPaths: 20_000, nSteps: 100 });
  const cells: unknown[] = [];
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

function extractRowMetrics(
  rows: ReturnType<typeof buildReport>["rows"],
  name: string,
): unknown {
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

const QSTAR_MUS = [-0.1, -0.05, 0, 0.05, 0.1, 0.15, 0.2];
const QSTAR_TS = [0.25, 0.5, 1, 2, 3];

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const params = withOverrides(defaultParams, args.overrides);

  mkdirSync(DATA_DIR, { recursive: true });

  const run = printMainTable(params);
  const runJson = resolve(DATA_DIR, `run-${params.seed}.json`);
  writeFileSync(runJson, JSON.stringify(run, null, 2));
  console.log(`\nwrote ${runJson}`);

  if (args.sweep) {
    console.log(`\nRunning parameter sweep…`);
    const sweep = runSweep(params);
    const sweepPath = resolve(DATA_DIR, "sweep.json");
    writeFileSync(sweepPath, JSON.stringify(sweep, null, 2));
    console.log(`wrote ${sweepPath}`);
  }

  const qSurface = {
    mus: QSTAR_MUS,
    Ts: QSTAR_TS,
    values: QSTAR_MUS.map((mu) =>
      QSTAR_TS.map((T) => closedForm(withOverrides(params, { mu, T })).QStar),
    ),
  };
  const qPath = resolve(DATA_DIR, "qstar-surface.json");
  writeFileSync(qPath, JSON.stringify(qSurface, null, 2));
  console.log(`wrote ${qPath}`);
}

main();
