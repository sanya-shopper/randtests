/* prng.js — small, seeded pseudorandom number generators used by the
 * visualizations. Every generator here is deterministic given its seed, so
 * each figure renders identically on every visit.
 *
 * Documented in README.md § Source map. Unit tests: tests/stats.test.mjs.
 *
 * Two of these generators are chosen for their *defects*, because the site
 * demonstrates tests by showing them fail:
 *   - randu()      — IBM's RANDU; all consecutive triples lie on 15 planes
 *                    (shown by assets/js/viz/randu3d.js on classical.html).
 *   - biasedBits() — a coin with adjustable bias (used by viz/pvalues.js).
 * mulberry32 serves as the "good enough for pictures" reference generator.
 */

/** IBM RANDU: x_{k+1} = 65539 · x_k mod 2^31. Seed must be odd.
 *  Returns a function yielding floats in (0, 1).
 *  Defect demonstrated on classical.html: because 65539 = 2^16 + 3,
 *  x_{k+2} ≡ 6·x_{k+1} − 9·x_k (mod 2^31), so consecutive triples fall on
 *  at most 15 parallel planes in the unit cube [Marsaglia 1968; Knuth 1997].
 */
export function randu(seed = 1) {
  let x = BigInt(seed | 1);              // force odd, keep exact 31-bit math
  const A = 65539n, M = 2147483648n;     // 2^31
  return () => {
    x = (A * x) % M;
    return Number(x) / 2147483648;
  };
}

/** mulberry32 — compact 32-bit generator with good statistical behaviour
 *  for graphics-scale sample sizes (not cryptographic, not BigCrush-clean).
 *  Standard public-domain construction (Tommy Ettinger).
 */
export function mulberry32(seed = 0x9e3779b9) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A Bernoulli bit source with adjustable bias: P(1) = p.
 *  Driven by mulberry32 so the *only* defect is the bias itself.
 *  Used by viz/pvalues.js to show how the p-value histogram of a chi-square
 *  test slides toward 0 as bias grows.
 */
export function biasedBits(p = 0.5, seed = 2) {
  const u = mulberry32(seed);
  return () => (u() < p ? 1 : 0);
}

/** Defective 24-bit generator for the birthday-spacings demo
 *  (viz/birthday.js): an LCG whose two lowest output bits are stuck at
 *  zero — a 22-bit generator in 24-bit clothing, the classic symptom of a
 *  power-of-two LCG's short-period low bits. All outputs sit on a grid of
 *  step 4, so spacings between sorted samples collide about four times as
 *  often as true randomness allows (effective year m′ = 2²², so the duplicate-
 *  spacing count K jumps from λ = 16 toward λ′ = n³/4m′ = 64), which is
 *  precisely the defect the birthday-spacings test measures.
 *  Returns integers in [0, 2^24) with the low 2 bits always zero.
 */
export function weakLcg24(seed = 12345) {
  let x = seed >>> 0;
  return () => {
    x = (Math.imul(x, 69069) + 1) >>> 0; // classic 2^32 LCG
    return (x >>> 8) & 0xfffffc;         // high 24 bits, low 2 forced to 0
  };
}
