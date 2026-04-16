// Browser Web Worker: runs the Monte Carlo sim off the main thread so
// continuous Observable sliders can re-render without jank.
//
// Bundled to report/data/sim.worker.js via `npm run bundle`.

import { closedForm } from "./models.ts";
import type { Params } from "./params.ts";
import { defaultParams, withOverrides } from "./params.ts";
import { buildReport } from "./report.ts";

export type Axis = "alpha" | "mu" | "sigma" | "T" | "Qratio";

export interface RunReq {
  type: "run";
  id: number;
  params: Partial<Params>;
  opts?: { keepPaths?: number; traceSize?: number; histBins?: number };
}

export interface Sweep1dReq {
  type: "sweep1d";
  id: number;
  axis: Axis;
  values: number[];
  params: Partial<Params>;
  pathsPerPoint?: number;
  stepsPerPoint?: number;
}

export type Req = RunReq | Sweep1dReq;

export interface SweepPoint {
  x: number;
  mean: number;
  sd: number;
  var95: number;
  var99: number;
  cvar95: number;
  cvar99: number;
  probLoss: number;
}

export type Res =
  | { type: "result"; id: number; report: ReturnType<typeof buildReport> }
  | { type: "sweep"; id: number; axis: Axis; points: SweepPoint[] }
  | { type: "error"; id: number; message: string };

function materialize(override: Partial<Params>): Params {
  return withOverrides(defaultParams, override);
}

export function runSingle(msg: RunReq): Res {
  const p = materialize(msg.params);
  const report = buildReport(p, msg.opts);
  return { type: "result", id: msg.id, report };
}

export function runSweep(msg: Sweep1dReq): Res {
  const base = materialize({
    nPaths: msg.pathsPerPoint ?? 15_000,
    nSteps: msg.stepsPerPoint ?? 80,
    ...msg.params,
  });
  // Q* depends on the other params, so snapshot it once for Qratio.
  const cfBase = closedForm(base);
  const points: SweepPoint[] = [];
  for (const x of msg.values) {
    let override: Partial<Params>;
    switch (msg.axis) {
      case "alpha":
        override = { alpha: x };
        break;
      case "mu":
        override = { mu: x };
        break;
      case "sigma":
        override = { sigma: x };
        break;
      case "T":
        override = { T: x };
        break;
      case "Qratio":
        override = { Q: x * cfBase.QStar };
        break;
    }
    const p = withOverrides(base, override);
    const r = buildReport(p, { keepPaths: 0, traceSize: 0, histBins: 1 });
    const row = r.rows.find((row) => row.name === "principal_3c");
    if (!row) throw new Error("principal_3c row missing from sweep report");
    points.push({
      x,
      mean: row.mcMean,
      sd: row.mcSd,
      var95: row.var95,
      var99: row.var99,
      cvar95: row.cvar95,
      cvar99: row.cvar99,
      probLoss: row.probLoss,
    });
  }
  return { type: "sweep", id: msg.id, axis: msg.axis, points };
}

export function dispatch(msg: Req): Res {
  try {
    if (msg.type === "run") return runSingle(msg);
    if (msg.type === "sweep1d") return runSweep(msg);
    throw new Error("unknown message type");
  } catch (e) {
    return {
      type: "error",
      id: msg.id,
      message: e instanceof Error ? e.message : String(e),
    };
  }
}

// Worker ambient globals aren't in the default TS lib; narrow-cast via
// globalThis so tsc --noEmit stays happy without pulling in the DOM lib.
// Skip the wiring if we're not in a Worker context (e.g. under vitest) so
// this module can also be imported for unit testing.
const ctx = (globalThis as unknown) as {
  onmessage: ((ev: { data: Req }) => void) | null;
  postMessage?: (msg: Res) => void;
};
if (typeof ctx.postMessage === "function") {
  ctx.onmessage = (ev) => {
    const res = dispatch(ev.data);
    ctx.postMessage!(res);
  };
}
