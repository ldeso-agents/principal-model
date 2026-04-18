// Log-exact GBM path sampler with trapezoidal I_T = ∫₀ᵀ S_t dt (O(Δ²) error).

import type { Rng } from "./rng.ts";

export interface GbmPath {
  /** Prices at t_0 = 0, …, t_N = T. Length nSteps + 1. */
  S: Float64Array;
  /** Trapezoidal estimate of ∫₀ᵀ S_t dt. */
  IT: number;
}

export interface SamplePathOpts {
  S0: number;
  mu: number;
  sigma: number;
  T: number;
  nSteps: number;
}

export function samplePath(rng: Rng, opts: SamplePathOpts): GbmPath {
  const { S0, mu, sigma, T, nSteps } = opts;
  const dt = T / nSteps;
  const drift = (mu - 0.5 * sigma * sigma) * dt;
  const diffusion = sigma * Math.sqrt(dt);

  const S = new Float64Array(nSteps + 1);
  S[0] = S0;

  let acc = 0.5 * S0;
  let Sprev = S0;
  for (let i = 1; i <= nSteps; i++) {
    const z = rng.normal();
    const Si = Sprev * Math.exp(drift + diffusion * z);
    S[i] = Si;
    acc += i === nSteps ? 0.5 * Si : Si;
    Sprev = Si;
  }

  return { S, IT: acc * dt };
}
