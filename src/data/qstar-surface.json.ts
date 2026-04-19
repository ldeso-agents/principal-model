import { qstarSurface } from "../lib/qstar.ts";

process.stdout.write(JSON.stringify(qstarSurface({ overrides: { seed: 42 } })));
