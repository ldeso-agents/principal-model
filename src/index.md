---
title: Klima Protocol — Fee-Based vs. Principal Model
---

# Klima Protocol — Fee-Based vs. Principal Model

_Revenue and risk for a carbon-retirement intermediary_

A three-phase research programme that asks a single question: when a
carbon-retirement intermediary sources tokens on the open market, should it
charge a **fee** or quote a fixed **principal** price — and how much risk does
each choice carry?

## Phases

<div class="grid grid-cols-2">
  <div class="card">

### [Phase A — Research note](./phase-a)

Mathematical framework, closed-form moments of the integrated GBM, and a
tail-risk metric menu for the fee model and the three principal variants
(pre-buy, back-to-back, and generalised hedge ratio $\alpha$).

[Read the note →](./phase-a)

  </div>
  <div class="card">

### [Phase B — Simulator](./phase-b)

TypeScript Monte Carlo reproduction of the Phase A closed forms, with
VaR / CVaR tail estimates and an Observable-powered notebook for exploring
$(\alpha, \mu, \sigma, f, Q, T)$.

[Open the simulator →](./phase-b)

  </div>
  <div class="card">

### [Phase C — Interactive](./phase-c)

Live Monte Carlo in the browser. Sliders for starting kVCM price,
starting carbon price per tonne, drift and variance, initial kVCM
inventory (tokens + cost basis), and constant retirements per day —
the scaffolding for the jump-diffusion and calibration work to come.

[Launch the interactive sim →](./phase-c)

  </div>
  <div class="card">

### [Conclusions](./conclusions)

Cross-phase take-aways, scope caveats, and a drawable price-curve tool
for deterministic stress-tests: sketch a crash, a spike, or load the
historical kVCM series and read the three books' P&L straight off the
curve.

[Read the synthesis →](./conclusions)

  </div>
</div>

## Source

- Research note: [`src/phase-a.md`](https://github.com/ldeso-agents/principal-model/blob/main/src/phase-a.md)
- Library: [`lib/`](https://github.com/ldeso-agents/principal-model/tree/main/lib) (Node ≥ 20, TypeScript, vitest)
- Reproducibility: seeded Mulberry32 PRNG; every figure in Phase B is regenerated from data loaders under `src/data/`.

The [Phase C interactive simulator](./phase-c) is live today on the
baseline GBM model; its price dynamics and demand model will be upgraded
iteratively (jump-diffusion, Poisson demand, calibration, dynamic
hedging) behind the same UI. The
[Conclusions](./conclusions) page collects the cross-phase
take-aways, the scope caveats, and a deterministic stress-test tool.
