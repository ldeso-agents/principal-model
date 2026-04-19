// Phase C raw-inventory Monte Carlo: supports custom (kPre, cBasis) state and
// the Merton jump-diffusion overlay. Sums I_T and the uncovered-tail integral
// J_τ on the same trajectory so the fee, back-to-back, and custom-inventory
// books reuse a single path of random draws.

import { mulberry32 } from "./rng.ts";

export interface SimulateInputs {
  S0: number;
  mu: number;
  sigma: number;
  P: number;
  lambda: number;
  T: number;
  Q: number;
  fee: number;
  kPre: number;
  cBasis: number;
  lambdaJ?: number;
  muJ?: number;
  sigmaJ?: number;
  nPaths: number;
  nSteps: number;
  seed: number;
  /** Retain up to this many full sampled paths for plotting. Default 0. */
  keepPaths?: number;
}

export interface SimulateResult {
  feeSamples: Float64Array;
  principalSamples: Float64Array;
  b2bSamples: Float64Array;
  ITSamples: Float64Array;
  terminalS: Float64Array;
  sampledPaths: Float64Array[];
  tauFrac: number;
  tokensUsedInternal: number;
  tokensLeftover: number;
  N: number;
}

export function simulate(inputs: SimulateInputs): SimulateResult {
  const {
    S0, mu, sigma, P, lambda, T, Q, fee, kPre, cBasis,
    nPaths, nSteps, seed,
  } = inputs;
  const lambdaJ = inputs.lambdaJ ?? 0;
  const muJ = inputs.muJ ?? 0;
  const sigmaJ = inputs.sigmaJ ?? 0;
  const keepPaths = inputs.keepPaths ?? 0;

  const rng = mulberry32(seed);
  const dt = T / nSteps;
  // Compensated Merton drift: subtracting λ_J·κ keeps E[S_t] = S_0·e^{μt}
  // regardless of jump settings, so turning jumps on widens the
  // distributions without shifting their means.
  const kappa = lambdaJ > 0
    ? Math.exp(muJ + 0.5 * sigmaJ * sigmaJ) - 1
    : 0;
  const drift = (mu - 0.5 * sigma * sigma - lambdaJ * kappa) * dt;
  const diffusion = sigma * Math.sqrt(dt);
  const lamDt = lambdaJ * dt;
  const N = lambda * T;
  // Fraction of horizon over which inventory lasts, clamped to [0, 1].
  // Retirements are a constant flow λ, so `kPre` tokens cover
  // τ = kPre / (λ P) years of demand.
  const tauFrac = (lambda > 0 && P > 0)
    ? Math.min(1, kPre / (lambda * P * T))
    : 1;
  const tokensUsedInternal = Math.min(kPre, lambda * T * P);
  const tokensLeftover = Math.max(0, kPre - lambda * T * P);
  // Snap tauFrac onto the integration grid and treat "only the endpoint
  // falls in [τT, T]" as an empty range — otherwise the trapezoid rule
  // would contribute 0.5·S_T·dt for a zero-length interval.
  const tailStartRaw = Math.ceil(tauFrac * nSteps);
  const tailStartStep = tailStartRaw >= nSteps ? nSteps + 1 : tailStartRaw;

  const feeSamples = new Float64Array(nPaths);
  const principalSamples = new Float64Array(nPaths);
  const b2bSamples = new Float64Array(nPaths);
  const ITSamples = new Float64Array(nPaths);
  const terminalS = new Float64Array(nPaths);
  const keep = Math.min(keepPaths, nPaths);
  const sampledPaths: Float64Array[] = [];

  for (let i = 0; i < nPaths; i++) {
    let S = S0;
    let IT = 0;
    let tailInt = 0;
    const path = (i < keep) ? new Float64Array(nSteps + 1) : null;
    if (path) path[0] = S;

    // Trapezoid rule: weight endpoints by 1/2.
    IT += 0.5 * S;
    if (tailStartStep === 0) tailInt += 0.5 * S;

    for (let k = 1; k <= nSteps; k++) {
      const z = rng.normal();
      let jumpSum = 0;
      if (lambdaJ > 0) {
        const nJ = rng.poisson(lamDt);
        for (let j = 0; j < nJ; j++) {
          jumpSum += muJ + sigmaJ * rng.normal();
        }
      }
      S = S * Math.exp(drift + diffusion * z + jumpSum);
      if (path) path[k] = S;
      const w = (k === nSteps) ? 0.5 : 1;
      IT += w * S;
      if (k >= tailStartStep) {
        const wt = (k === tailStartStep || k === nSteps) ? 0.5 : 1;
        tailInt += wt * S;
      }
    }
    IT *= dt;
    tailInt *= dt;
    terminalS[i] = S;
    ITSamples[i] = IT;

    // R_fee = f · P · λ · I_T.
    feeSamples[i] = fee * P * lambda * IT;

    // Back-to-back principal book (no pre-purchase): Π = Q·N − P·λ·I_T.
    b2bSamples[i] = Q * N - P * lambda * IT;

    // Custom principal with initial inventory:
    //   Π = Q·N − C_basis − P·λ·∫_{τT}^{T} S_t dt + leftover · S_T.
    principalSamples[i] =
      Q * N - cBasis - P * lambda * tailInt + tokensLeftover * S;

    if (path) sampledPaths.push(path);
  }

  return {
    feeSamples,
    principalSamples,
    b2bSamples,
    ITSamples,
    terminalS,
    sampledPaths,
    tauFrac,
    tokensUsedInternal,
    tokensLeftover,
    N,
  };
}
