# principal-model

This repo holds the TypeScript simulator and the Quarto report that
back [`research-note.md`](research-note.md), *Klima Protocol:
Fee-Based vs. Principal Model*. It is aimed at anyone rebuilding the
report or running fresh experiments against the note's identities.
The report has four pages: **Summary** (`index.qmd`) for the
high-level story, **Model** (`model.qmd`) for the derivations,
**Validation** (`validation.qmd`) for closed-form vs Monte Carlo
checks, and **Simulator** (`simulator.qmd`) for an in-browser
playground.

## Getting started

The project needs Node.js ≥ 20 and npm ≥ 10; rendering the report also
needs Quarto ≥ 1.4. After `npm install`, the usual workflow is

```sh
npm install
npm run simulate -- --seed 42
npm run sweep    -- --seed 42
npm run typecheck
npm test
```

followed by `quarto preview report/validation.qmd` or `quarto preview
report/simulator.qmd` to see the rendered pages. The simulate and
sweep commands drop JSON artifacts into `report/data/`:
`run-<seed>.json` holds the single-run parameters together with the
closed-form and Monte Carlo metrics, the $I_T$ histogram, sampled
paths and P&L traces; `sweep.json` holds the $(\alpha, \mu, \sigma)$
grid with one Monte Carlo run per cell; and `qstar-surface.json` holds
the $Q^*(\mu, T)$ closed-form surface.

## Commands

Flags passed to `npm run simulate` or `npm run sweep`; every override
wins over the defaults in `src/params.ts`.

| flag | meaning |
| --- | --- |
| `--seed N` | PRNG seed |
| `--paths N` | override `nPaths` |
| `--steps N` | override `nSteps` |
| `--alpha x` | override $\alpha$ |
| `--mu x` / `--sigma x` | override $\mu$, $\sigma$ |
| `--f x` / `--Q x` / `--T x` | override fee, quote, horizon |
| `--lambdaJ x` / `--muJ x` / `--sigmaJ x` | Merton jump params (0 ⇒ pure GBM) |
| `--h x` / `--fPost x` | threshold $h$, fee-mode rate ($h = \infty$ disables) |
| `--sweep` | also emit `sweep.json` |

A typical regeneration is `--seed N --sweep`, which pins the PRNG
while refreshing both `run-<seed>.json` and `sweep.json` in one pass.

## Layout

Roughly source → tests → report fixtures: `src/` holds the core
library and CLI, `test/` the vitest suite that checks every closed
form in the note, and `report/` the Quarto pages plus the JSON
artifacts they read.

```
src/
  core/
    rng.ts                   Mulberry32 + Box-Muller + Knuth Poisson
    moments.ts               Dufresne moments of I_T and switching anchors
    gbm.ts                   log-exact GBM + trapezoidal I_T + Merton overlay
    risk.ts                  quantile, VaR, CVaR, shortfall
    models.ts                closed form + MC for fee, b2b, retained, treasury
    simulate-run.ts          one-shot Monte Carlo driver
    simulate-switching.ts    switching-book Monte Carlo driver
    ticks.ts                 shared axis-tick helpers
    index.ts                 browser-facing barrel
  params.ts                  Params type and defaults
  report.ts                  scorecard + break-even + histograms
  cli.ts                     entrypoint
  fetch-historical-price.ts  Alchemy Prices pull
test/                        vitest suite
report/
  index.qmd                  Summary
  model.qmd                  Model (includes research-note.md)
  validation.qmd             Validation
  simulator.qmd              Simulator
  data/                      JSON artifacts
```
