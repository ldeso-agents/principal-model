// Seeded Mulberry32 PRNG with Box-Muller standard-normal sampling.

export interface Rng {
  uniform(): number;
  normal(): number;
}

export function mulberry32(seed: number): Rng {
  let state = seed >>> 0;
  let cached: number | null = null;

  const uniform = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    // Clamp away from 0 so Box-Muller's log() is safe.
    const u = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    return u === 0 ? 1 / 4294967296 : u;
  };

  const normal = (): number => {
    if (cached !== null) {
      const z = cached;
      cached = null;
      return z;
    }
    const u1 = uniform();
    const u2 = uniform();
    const r = Math.sqrt(-2 * Math.log(u1));
    const theta = 2 * Math.PI * u2;
    cached = r * Math.sin(theta);
    return r * Math.cos(theta);
  };

  return { uniform, normal };
}
