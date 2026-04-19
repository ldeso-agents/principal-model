# principal-model — Phases B + C

TypeScript simulator and Observable Framework report for the research note
*Klima Protocol — Fee-Based vs. Principal Model* ([`src/phase-a.md`](src/phase-a.md),
Phase A).

- **Phase B** reproduces the §1–§5 closed-form quantities computationally,
  estimates the §4 tail-risk metrics by Monte Carlo, and exposes the
  results through an Observable Framework notebook.
- **Phase C** is a browser-native interactive simulator
  ([`src/phase-c.md`](src/phase-c.md)). Every slider re-runs a fresh Monte
  Carlo on the parameters of your choosing (starting kVCM price, starting
  carbon price per tonne, drift and variance, optional Merton jump-diffusion
  overlay via three jump sliders, initial inventory as tokens + cost basis,
  constant retirements per day), and a drawable custom-curve scenario (with
  an Alchemy-fed historical preset) evaluates the three books on a single
  user-sketched path. Subsequent Phase C iterations will swap in the
  remaining richer dynamics (regime switching, Poisson demand, full
  calibration, dynamic hedging) behind the same UI.

## Requirements

- Node.js ≥ 20 (the Pages workflow pins 22)
- npm ≥ 10

## Install

```sh
npm install
```

## Run

```sh
# Live preview — auto-runs data loaders on demand.
npm run dev

# One-shot static build into dist/.
npm run build

# Type-check + unit tests (43 vitest specs).
npm run typecheck
npm test
```

`npm run build` invokes the data loaders under `src/data/` which call
directly into the library:

- `src/data/run-42.json.ts` → `runSingle` in `src/lib/run.ts` — params,
  closed-form metrics, MC metrics, $I_T$ histogram, sampled paths,
  sub-sampled P&L traces, Merton jump-check block.
- `src/data/sweep.json.ts` → `runSweep` in `src/lib/sweep.ts` — grid over
  $(\alpha, \mu, \sigma)$ with per-cell MC metrics.
- `src/data/qstar-surface.json.ts` → `qstarSurface` in `src/lib/qstar.ts` —
  $Q^*(\mu, T)$ closed-form surface.
- `src/data/kvcm-historical.json.ts` → `fetchHistoricalPrice` in
  `src/lib/fetch-historical-price.ts` — daily kVCM spot from Alchemy.
  Requires `ALCHEMY_API_KEY`; falls back to `{ data: [] }` when absent so
  the Conclusions page's *Historical* preset degrades to a no-op without
  failing the build.

## Layout

```
src/                            Observable Framework source root
  index.md                      landing page linking Phases A / B / C
  phase-a.md                    Phase A research note (inlined)
  phase-b.md                    Phase B — scorecard, sweeps, Q* surface
  phase-c.md                    Phase C — live in-browser Monte Carlo
  conclusions.md                Cross-phase take-aways + drawable curve
  components/                   page-level TS + CSS shared across pages
    phase-layout.ts             sticky-sidebar gutter measurement
    phase-styles.css            .pc-section, .metric-grid, .pc-curve-*, …
  data/                         Framework data loaders (.ts → emitted .json)
  lib/                          TypeScript Monte-Carlo library (nested so the
                                Framework source-tree import rules allow the
                                .md pages to import it directly).
    rng.ts                      seeded Mulberry32 + Box-Muller + Knuth Poisson
    moments.ts                  Dufresne E[I_T], Var[I_T] with μ→0 limit
    gbm.ts                      log-exact GBM stepper + trapezoidal I_T, optional Merton jumps
    risk.ts                     quantile, VaR, CVaR, shortfall-vs-schedule
    params.ts                   typed Params + defaults
    models.ts                   closed-form + MC for fee, 3a, 3b, 3c; break-even Q*
    report.ts                   §4/§5 table assembly + histograms
    simulate.ts                 Phase-C raw-inventory MC (kPre, cBasis)
    summarise.ts                browser-friendly summary (mean/SD/VaR/CVaR/…)
    util.ts                     calendar-ish tick helpers (week/month/year)
    run.ts                      runSingle() — Phase B artifact entrypoint
    sweep.ts                    runSweep() — parameter sweep entrypoint
    qstar.ts                    qstarSurface() — closed-form grid entrypoint
    index.ts                    barrel re-export used by the Framework pages
    fetch-historical-price.ts   Alchemy Prices API wrapper
test/                           vitest unit + cross-check suite (43 tests)
observablehq.config.ts          Framework config (KaTeX, pages, theme)
```

## Verification notes

- $\mathrm{Var}[\Pi_{\mathrm{b2b}}] / \mathrm{Var}[R_{\mathrm{fee}}] = (P / f)^2$ — same $I_T$ kernel, rescaled (§3b).
- $\alpha = 1$ collapses $\Pi_\alpha$ to the deterministic matched P&L path-by-path.
- $\alpha = 0$ makes $\Pi_\alpha$ coincide with $\Pi_{\mathrm{b2b}}$ path-by-path.
- $Q = Q^*$ equalises $\mathbb{E}[R_{\mathrm{fee}}]$ and $\mathbb{E}[\Pi_{\mathrm{b2b}}]$ (§5).
- $\mu = 0 \Rightarrow Q^* = (1 + f) \cdot P \cdot S_0$ to machine precision.
- The §3a NAV drawdown reports $\max_t [N \cdot P \cdot (1-t/T) \cdot (S_0 - S_t)]_+$ —
  shortfall against the deterministic decay schedule — because the
  literal $\max_t (V_0 - V_t)$ from the note is pinned to $V_0$ under
  the $V_T = 0$ burn convention. See `src/lib/risk.ts` for details.

## References

- Dufresne, D. (2001). *The integral of geometric Brownian motion.*
- Glasserman, P. (2003). *Monte Carlo Methods in Financial Engineering*, §3.4.
