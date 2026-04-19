import { buildReport, type Report } from "./report.ts";
import { defaultParams, withOverrides, type Params } from "./params.ts";

export interface JumpCheckRow {
  name: string;
  gbmClosedMean: number;
  gbmClosedSd: number;
  mertonMcMean: number;
  mertonMcCi95: number;
  mertonMcSd: number;
  zVsGbmClosed: number;
}

export interface JumpCheck {
  overlay: { lambdaJ: number; muJ: number; sigmaJ: number };
  rows: JumpCheckRow[];
  terminalSCheck: {
    gbmClosed: number;
    mertonMcMean: number;
    zVsGbmClosed: number;
  };
}

export type RunArtifact = Report & { jumpCheck: JumpCheck };

// Canonical Merton overlay used to verify phase-a.md §6: the compensated
// drift keeps every closed-form *mean* identical to the GBM anchor even with
// fat, negatively-biased jumps.
const JUMP_CHECK: { lambdaJ: number; muJ: number; sigmaJ: number } = {
  lambdaJ: 3,
  muJ: -0.1,
  sigmaJ: 0.15,
};

function runJumpCheck(baseParams: Params): JumpCheck {
  const jumpParams = withOverrides(baseParams, JUMP_CHECK);
  const r = buildReport(jumpParams, { keepPaths: 0, traceSize: 0, histBins: 0 });
  return {
    overlay: JUMP_CHECK,
    rows: r.rows.map((row) => ({
      name: row.name,
      gbmClosedMean: row.closedFormMean,
      gbmClosedSd: row.closedFormSd,
      mertonMcMean: row.mcMean,
      mertonMcCi95: row.mcCi95,
      mertonMcSd: row.mcSd,
      zVsGbmClosed: row.zScore,
    })),
    terminalSCheck: {
      gbmClosed: r.terminalSCheck.closedForm,
      mertonMcMean: r.terminalSCheck.mcMean,
      zVsGbmClosed: r.terminalSCheck.zScore,
    },
  };
}

export function runSingle(
  opts: { overrides?: Partial<Params> } = {},
): RunArtifact {
  const params = withOverrides(defaultParams, opts.overrides ?? {});
  const report = buildReport(params, { keepPaths: 25 });
  const jumpCheck = runJumpCheck(params);
  return { ...report, jumpCheck };
}
