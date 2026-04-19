import { closedForm } from "./models.ts";
import { defaultParams, withOverrides, type Params } from "./params.ts";

const QSTAR_MUS = [-0.1, -0.05, 0, 0.05, 0.1, 0.15, 0.2];
const QSTAR_TS = [0.25, 0.5, 1, 2, 3];

export interface QStarSurface {
  mus: number[];
  Ts: number[];
  values: number[][];
}

export function qstarSurface(
  opts: { overrides?: Partial<Params> } = {},
): QStarSurface {
  const params = withOverrides(defaultParams, opts.overrides ?? {});
  return {
    mus: QSTAR_MUS,
    Ts: QSTAR_TS,
    values: QSTAR_MUS.map((mu) =>
      QSTAR_TS.map((T) => closedForm(withOverrides(params, { mu, T })).QStar),
    ),
  };
}
