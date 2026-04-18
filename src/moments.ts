// Closed-form moments of the GBM path integral I_T := ∫₀ᵀ S_t dt.
// Source: Dufresne (2001); μ → 0 and (2μ + σ²) → 0 limits via expm1(x)/x.

export interface GbmMoments {
  mean: number;
  variance: number;
}

// (e^x − 1) / x, with the analytic limit 1 at x = 0. expm1 keeps precision
// for small |x|; the series branch covers values where expm1(x)/x loses ulps.
export function expm1OverX(x: number): number {
  if (x === 0) return 1;
  if (Math.abs(x) < 1e-8) return 1 + x / 2 + (x * x) / 6;
  return Math.expm1(x) / x;
}

export function expectedIt(S0: number, mu: number, T: number): number {
  return S0 * T * expm1OverX(mu * T);
}

export function secondMomentIt(
  S0: number,
  mu: number,
  sigma: number,
  T: number,
): number {
  // σ = 0: deterministic, so E[I_T²] = E[I_T]². Handle directly to avoid 0/0.
  if (sigma === 0) {
    const m = expectedIt(S0, mu, T);
    return m * m;
  }

  const s2 = sigma * sigma;
  const a = mu;
  const b = 2 * mu + s2;
  const denom = mu + s2;

  const bracket = T * expm1OverX(b * T) - T * expm1OverX(a * T);

  if (Math.abs(denom) < 1e-12) {
    // μ ≈ −σ² with σ > 0: 1/(μ+σ²) diverges while the bracket stays finite.
    // L'Hôpital in σ² at fixed μ, evaluated at b = μ.
    const aT = a * T;
    return 2 * S0 * S0 * ((T * Math.exp(aT)) / a - Math.expm1(aT) / (a * a));
  }

  return (2 * S0 * S0 * bracket) / denom;
}

export function varianceIt(
  S0: number,
  mu: number,
  sigma: number,
  T: number,
): number {
  const m1 = expectedIt(S0, mu, T);
  const m2 = secondMomentIt(S0, mu, sigma, T);
  // Floor at 0 to absorb catastrophic cancellation near σ = 0.
  return Math.max(0, m2 - m1 * m1);
}

export function gbmMoments(
  S0: number,
  mu: number,
  sigma: number,
  T: number,
): GbmMoments {
  return {
    mean: expectedIt(S0, mu, T),
    variance: varianceIt(S0, mu, sigma, T),
  };
}
