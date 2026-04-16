import { describe, expect, it } from "vitest";

import { dispatch } from "../src/worker.ts";

describe("worker dispatch", () => {
  it("runs a single-shot report and returns parseable rows", () => {
    const res = dispatch({
      type: "run",
      id: 1,
      params: { nPaths: 2_000, nSteps: 50, seed: 42 },
      opts: { keepPaths: 0, traceSize: 100, histBins: 20 },
    });
    expect(res.type).toBe("result");
    if (res.type !== "result") throw new Error("expected result");
    expect(res.id).toBe(1);
    const names = res.report.rows.map((r) => r.name).sort();
    expect(names).toEqual(
      ["fee", "principal_3a", "principal_3b", "principal_3c"].sort(),
    );
  });

  it("sweep1d over sigma returns one point per value", () => {
    const values = [0.2, 0.5, 0.8];
    const res = dispatch({
      type: "sweep1d",
      id: 2,
      axis: "sigma",
      values,
      params: { alpha: 0.5, mu: 0.05, T: 1 },
      pathsPerPoint: 2_000,
      stepsPerPoint: 50,
    });
    expect(res.type).toBe("sweep");
    if (res.type !== "sweep") throw new Error("expected sweep");
    expect(res.points.map((p) => p.x)).toEqual(values);
    // CVaR95 should be monotonic in sigma for the principal-3c book.
    const c = res.points.map((p) => p.cvar95);
    expect(c[1]).toBeGreaterThan(c[0] as number);
    expect(c[2]).toBeGreaterThan(c[1] as number);
  });

  it("sweep1d over Qratio rescales Q against Q*", () => {
    const res = dispatch({
      type: "sweep1d",
      id: 3,
      axis: "Qratio",
      values: [0.9, 1.0, 1.1],
      params: { alpha: 0.0, mu: 0.05, sigma: 0.5, T: 1 },
      pathsPerPoint: 2_000,
      stepsPerPoint: 50,
    });
    if (res.type !== "sweep") throw new Error("expected sweep");
    // Higher Q → higher E[Π_b2b] (and thus E[Π_3c] at α=0) monotonically.
    const m = res.points.map((p) => p.mean);
    expect(m[1]).toBeGreaterThan(m[0] as number);
    expect(m[2]).toBeGreaterThan(m[1] as number);
  });

  it("returns an error envelope for an invalid message type", () => {
    const res = dispatch({ type: "nope", id: 9 } as unknown as Parameters<typeof dispatch>[0]);
    expect(res.type).toBe("error");
    if (res.type !== "error") throw new Error("expected error");
    expect(res.id).toBe(9);
  });
});
