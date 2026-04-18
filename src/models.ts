// Per-model P&L closed-form moments and Monte Carlo sampler. See §2, §3, §5.

import { samplePath } from "./gbm.ts";
import { gbmMoments, expm1OverX } from "./moments.ts";
import type { Params } from "./params.ts";
import { mulberry32 } from "./rng.ts";
import { shortfallVsSchedule } from "./risk.ts";

export interface ClosedForm {
  fee: { mean: number; variance: number; sd: number };
  matched: { mean: number; variance: 0; sd: 0 };
  b2b: { mean: number; variance: number; sd: number };
  partial: { mean: number; variance: number; sd: number };
  /** Break-even quote equalising E[Π_b2b] with E[R_fee]. */
  QStar: number;
  IT: { mean: number; variance: number };
  /** Inventory notional N = λ · T. */
  N: number;
}

export function closedForm(p: Params): ClosedForm {
  const N = p.lambda * p.T;
  const { mean: eIt, variance: vIt } = gbmMoments(p.S0, p.mu, p.sigma, p.T);

  const feeMean = p.f * p.P * p.lambda * eIt;
  const feeVar = (p.f * p.P * p.lambda) ** 2 * vIt;

  const matchedMean = N * (p.Q - p.P * p.S0);

  const b2bMean = p.Q * N - p.P * p.lambda * eIt;
  const b2bVar = (p.P * p.lambda) ** 2 * vIt;

  const partialMean = (1 - p.alpha) * b2bMean + p.alpha * matchedMean;
  const partialVar = (1 - p.alpha) ** 2 * b2bVar;

  // Q* = (1 + f) · P · S_0 · (e^{μT} − 1)/(μT); expm1OverX handles μ → 0.
  const QStar = (1 + p.f) * p.P * p.S0 * expm1OverX(p.mu * p.T);

  return {
    fee: { mean: feeMean, variance: feeVar, sd: Math.sqrt(feeVar) },
    matched: { mean: matchedMean, variance: 0, sd: 0 },
    b2b: { mean: b2bMean, variance: b2bVar, sd: Math.sqrt(b2bVar) },
    partial: {
      mean: partialMean,
      variance: partialVar,
      sd: Math.sqrt(partialVar),
    },
    QStar,
    IT: { mean: eIt, variance: vIt },
    N,
  };
}

export interface McSamples {
  fee: Float64Array;
  b2b: Float64Array;
  partial: Float64Array;
  /** Deterministic; returned scalar for table symmetry. */
  matched: number;
  /** Shared random kernel I_T. */
  IT: Float64Array;
  /** max_{t ≤ T} shortfall-vs-schedule per path (3a). */
  navDrawdowns: Float64Array;
  terminalS: Float64Array;
}

export interface SampleOpts {
  /** Full paths retained for plotting; capped by nPaths. */
  keepPaths?: number;
}

export interface McResult extends McSamples {
  sampledPaths: Float64Array[];
}

export function simulate(p: Params, opts: SampleOpts = {}): McResult {
  const rng = mulberry32(p.seed);
  const N = p.lambda * p.T;
  const matchedPnL = N * (p.Q - p.P * p.S0);

  const fee = new Float64Array(p.nPaths);
  const b2b = new Float64Array(p.nPaths);
  const partial = new Float64Array(p.nPaths);
  const IT = new Float64Array(p.nPaths);
  const navDrawdowns = new Float64Array(p.nPaths);
  const terminalS = new Float64Array(p.nPaths);

  const keep = Math.min(opts.keepPaths ?? 0, p.nPaths);
  const sampledPaths: Float64Array[] = [];

  const alphaShift = p.alpha * p.S0 * p.T;
  const navNotional = N * p.P;

  for (let i = 0; i < p.nPaths; i++) {
    const path = samplePath(rng, {
      S0: p.S0,
      mu: p.mu,
      sigma: p.sigma,
      T: p.T,
      nSteps: p.nSteps,
    });
    IT[i] = path.IT;
    terminalS[i] = path.S[p.nSteps] as number;

    fee[i] = p.f * p.P * p.lambda * path.IT;
    b2b[i] = p.Q * N - p.P * p.lambda * path.IT;
    partial[i] =
      p.Q * N - p.P * p.lambda * (alphaShift + (1 - p.alpha) * path.IT);

    navDrawdowns[i] = shortfallVsSchedule(path.S, navNotional);

    if (i < keep) sampledPaths.push(path.S);
  }

  return {
    fee,
    b2b,
    partial,
    matched: matchedPnL,
    IT,
    navDrawdowns,
    terminalS,
    sampledPaths,
  };
}
