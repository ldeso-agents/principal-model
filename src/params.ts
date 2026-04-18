export interface Params {
  /** kVCM/USD spot at t=0. */
  S0: number;
  /** GBM drift (annualised). */
  mu: number;
  /** GBM volatility (annualised). */
  sigma: number;
  /** Protocol price kVCM/tonne, constant. */
  P: number;
  /** Retirement flow, tonnes per unit time. */
  lambda: number;
  /** Horizon (same time unit as μ, σ, λ). */
  T: number;
  /** Fee rate. */
  f: number;
  /** Fixed USD quote per tonne (principal model). */
  Q: number;
  /** Pre-purchase fraction for 3c ∈ [0, 1]; α = 1 ↔ 3a, α = 0 ↔ 3b. */
  alpha: number;

  nPaths: number;
  nSteps: number;
  seed: number;
}

export const defaultParams: Params = {
  S0: 1.0,
  mu: 0.05,
  sigma: 0.5,
  P: 1.0,
  lambda: 1_000,
  T: 1.0,
  f: 0.05,
  Q: 1.08,
  alpha: 0.5,

  nPaths: 100_000,
  nSteps: 250,
  seed: 42,
};

export function withOverrides(
  defaults: Params,
  overrides: Partial<Params>,
): Params {
  return { ...defaults, ...overrides };
}
