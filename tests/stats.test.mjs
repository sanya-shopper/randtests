/* stats.test.mjs — unit tests for assets/js/stats.js and assets/js/prng.js.
 *
 * Run with:  node --test tests/*.mjs
 * Documented in README.md § Testing. Reference values for the special
 * functions come from standard chi-square tables and closed forms:
 *   - Γ(5) = 24, Γ(½) = √π
 *   - χ² with 2 df has the closed-form tail p = exp(−x/2)
 *   - the 95th percentile of χ²₁ is 3.841, of χ²₁₀ is 18.307
 * The RANDU test verifies the exact algebraic defect the site demonstrates
 * (classical.html § RANDU): x_{k+2} ≡ 6·x_{k+1} − 9·x_k (mod 2³¹).
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  lnGamma, gammaP, chi2PValue, chiSquareTest, entStats, histogram01,
} from "../assets/js/stats.js";
import { randu, mulberry32, biasedBits, weakLcg24 } from "../assets/js/prng.js";

const close = (a, b, eps = 1e-9) =>
  assert.ok(Math.abs(a - b) < eps, `expected ${a} ≈ ${b} (±${eps})`);

test("lnGamma matches closed forms", () => {
  close(lnGamma(5), Math.log(24), 1e-12);           // Γ(5) = 4!
  close(lnGamma(0.5), Math.log(Math.sqrt(Math.PI)), 1e-12);
  close(lnGamma(1), 0, 1e-12);
});

test("gammaP matches the exponential special case", () => {
  // P(1, x) = 1 − e^(−x)
  close(gammaP(1, 1), 1 - Math.exp(-1), 1e-12);
  close(gammaP(1, 5), 1 - Math.exp(-5), 1e-12);
  // series (x < s+1) and continued fraction (x ≥ s+1) must agree where
  // they meet — a discontinuity here would corrupt every p-value
  close(gammaP(3, 3.9999999), gammaP(3, 4.0000001), 1e-6);
});

test("chi2PValue reproduces standard chi-square tables", () => {
  close(chi2PValue(3.841, 1), 0.05, 5e-4);    // 95th percentile, 1 df
  close(chi2PValue(18.307, 10), 0.05, 5e-4);  // 95th percentile, 10 df
  close(chi2PValue(4, 2), Math.exp(-2), 1e-9); // closed form for 2 df
  close(chi2PValue(0, 5), 1, 1e-12);
});

test("chiSquareTest computes Pearson's statistic", () => {
  // hand-computed: O = [60, 40], E = [50, 50] → χ² = 100/50 + 100/50 = 4
  const { chi2, df, p } = chiSquareTest([60, 40], [50, 50]);
  close(chi2, 4, 1e-12);
  assert.equal(df, 1);
  close(p, chi2PValue(4, 1), 1e-12);
  assert.throws(() => chiSquareTest([1, 2], [3]), /mismatch/);
  assert.throws(() => chiSquareTest([1], [0]), /expected count/);
});

test("chi-square p-values are approximately uniform for a fair source", () => {
  // The claim behind foundations.html § Two-level testing, in miniature.
  const bit = biasedBits(0.5, 123);
  let small = 0;
  const runs = 200, n = 1000;
  for (let r = 0; r < runs; r++) {
    let ones = 0;
    for (let i = 0; i < n; i++) ones += bit();
    if (chiSquareTest([ones, n - ones], [n / 2, n / 2]).p < 0.05) small += 1;
  }
  // Expect ~10 of 200 below 0.05; allow a wide, deterministic-safe margin.
  assert.ok(small < 30, `too many rejections for a fair coin: ${small}`);
});

test("RANDU satisfies its defining defect", () => {
  // x_{k+2} ≡ 6·x_{k+1} − 9·x_k (mod 2³¹) — the identity behind the
  // fifteen planes (classical.html § RANDU).
  const u = randu(1);
  const M = 2 ** 31;
  const xs = Array.from({ length: 50 }, () => Math.round(u() * M));
  for (let k = 0; k + 2 < xs.length; k++) {
    const predicted = ((6 * xs[k + 1] - 9 * xs[k]) % M + M) % M;
    assert.equal(xs[k + 2], predicted, `RANDU recurrence broken at k=${k}`);
  }
});

test("generators are deterministic given a seed", () => {
  const a = mulberry32(7), b = mulberry32(7);
  for (let i = 0; i < 100; i++) assert.equal(a(), b());
  const c = weakLcg24(3), d = weakLcg24(3);
  for (let i = 0; i < 100; i++) assert.equal(c(), d());
});

test("generator outputs stay in range", () => {
  const u = mulberry32(1), r = randu(1), w = weakLcg24(1);
  for (let i = 0; i < 1000; i++) {
    const x = u(), y = r(), z = w();
    assert.ok(x >= 0 && x < 1);
    assert.ok(y > 0 && y < 1);
    assert.ok(Number.isInteger(z) && z >= 0 && z < 2 ** 24);
    assert.equal(z & 3, 0, "weakLcg24's defining defect: low 2 bits stuck at 0");
  }
});

test("entStats flags text and accepts uniform bytes", () => {
  // Uniform-ish bytes from mulberry32.
  const u = mulberry32(11);
  const good = new Uint8Array(65536);
  for (let i = 0; i < good.length; i++) good[i] = Math.floor(u() * 256);
  const g = entStats(good);
  assert.ok(g.entropy > 7.99, `entropy ${g.entropy}`);
  assert.ok(Math.abs(g.mean - 127.5) < 1.5, `mean ${g.mean}`);
  assert.ok(Math.abs(g.piEstimate - Math.PI) < 0.05, `pi ${g.piEstimate}`);
  assert.ok(Math.abs(g.serialCorrelation) < 0.02);

  // Repeated ASCII text must fail entropy badly (ent.html's point).
  const s = "the quick brown fox jumps over the lazy dog. ";
  const text = new Uint8Array(65536);
  for (let i = 0; i < text.length; i++) text[i] = s.charCodeAt(i % s.length);
  const t = entStats(text);
  assert.ok(t.entropy < 5, `text entropy should be low, got ${t.entropy}`);
  assert.ok(t.chi2P < 1e-6, "text should fail the chi-square test");
});

test("histogram01 bins correctly, including the top edge", () => {
  const bins = histogram01([0, 0.049, 0.05, 0.5, 0.999999], 20);
  assert.equal(bins[0], 2);
  assert.equal(bins[1], 1);
  assert.equal(bins[10], 1);
  assert.equal(bins[19], 1);
  assert.equal(bins.reduce((a, b) => a + b, 0), 5);
});
