import { runSweep } from "../lib/sweep.ts";

process.stdout.write(JSON.stringify(runSweep({ overrides: { seed: 42 } })));
