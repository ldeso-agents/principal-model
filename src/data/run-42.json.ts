import { runSingle } from "../lib/run.ts";

process.stdout.write(JSON.stringify(runSingle({ overrides: { seed: 42 } })));
