/* stats.js — the statistical machinery shared by the visualizations:
 * chi-square goodness of fit, the regularized incomplete gamma function it
 * needs, and byte-stream summary statistics in the style of ENT.
 *
 * Formulas follow foundations.html (chi-square, p-values) and ent.html
 * (stream statistics); the pages cite the primary sources. Unit tests with
 * known reference values live in tests/stats.test.mjs — run `node --test`.
 */

/** Natural log of the gamma function (Lanczos approximation, g = 7).
 *  Accurate to ~1e-13 for x > 0 — far more than the figures need. */
export function lnGamma(x) {
  const c = [
    676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012,
    9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (x < 0.5) {
    // reflection: Γ(x)Γ(1−x) = π / sin(πx)
    return Math.log(Math.PI / Math.sin(Math.PI * x)) - lnGamma(1 - x);
  }
  x -= 1;
  let a = 0.99999999999980993;
  const t = x + 7.5;
  for (let i = 0; i < c.length; i++) a += c[i] / (x + i + 1);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

/** Regularized lower incomplete gamma P(s, x); Q(s, x) = 1 − P(s, x).
 *  Series for x < s + 1, continued fraction otherwise (Numerical-Recipes
 *  style gser/gcf split). */
export function gammaP(s, x) {
  if (x < 0 || s <= 0) return NaN;
  if (x === 0) return 0;
  if (x < s + 1) {
    // series expansion
    let sum = 1 / s, term = sum, k = s;
    for (let i = 0; i < 500; i++) {
      k += 1;
      term *= x / k;
      sum += term;
      if (Math.abs(term) < Math.abs(sum) * 1e-15) break;
    }
    return sum * Math.exp(-x + s * Math.log(x) - lnGamma(s));
  }
  // continued fraction for Q, then P = 1 − Q
  let b = x + 1 - s, c = 1e300, d = 1 / b, h = d;
  for (let i = 1; i < 500; i++) {
    const an = -i * (i - s);
    b += 2;
    d = an * d + b; if (Math.abs(d) < 1e-300) d = 1e-300;
    c = b + an / c; if (Math.abs(c) < 1e-300) c = 1e-300;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-15) break;
  }
  const q = Math.exp(-x + s * Math.log(x) - lnGamma(s)) * h;
  return 1 - q;
}

/** Upper-tail p-value of a chi-square statistic with df degrees of freedom:
 *  p = Q(df/2, x/2) — NIST SP 800-22 writes this as igamc(df/2, x/2). */
export function chi2PValue(x, df) {
  return 1 - gammaP(df / 2, x / 2);
}

/** Pearson chi-square goodness-of-fit test.
 *  observed: array of counts; expected: array of expected counts (same
 *  length, all > 0). Returns { chi2, df, p }. df = k − 1 unless the caller
 *  overrides it (e.g. when parameters were estimated from the data).
 *  Validity caveat (foundations.html § Chi-square): expected counts should
 *  be ≥ 5, or bins merged first — this function does not merge for you. */
export function chiSquareTest(observed, expected, df = observed.length - 1) {
  if (observed.length !== expected.length) {
    throw new Error("observed/expected length mismatch");
  }
  let chi2 = 0;
  for (let i = 0; i < observed.length; i++) {
    const e = expected[i];
    if (!(e > 0)) throw new Error(`expected count must be > 0 (bin ${i})`);
    const d = observed[i] - e;
    chi2 += (d * d) / e;
  }
  return { chi2, df, p: chi2PValue(chi2, df) };
}

/** ENT-style statistics of a byte array (ent.html § What ENT computes):
 *  Shannon entropy (bits/byte), chi-square vs uniform bytes, arithmetic
 *  mean, Monte-Carlo π estimate from byte-pair coordinates, and lag-1
 *  serial correlation. Mirrors Walker's definitions [Walker 2008]. */
export function entStats(bytes) {
  const n = bytes.length;
  const counts = new Array(256).fill(0);
  let sum = 0;
  for (let i = 0; i < n; i++) { counts[bytes[i]] += 1; sum += bytes[i]; }

  let entropy = 0;
  for (let i = 0; i < 256; i++) {
    if (counts[i] === 0) continue;
    const f = counts[i] / n;
    entropy -= f * Math.log2(f);
  }

  const expected = new Array(256).fill(n / 256);
  const { chi2, p } = chiSquareTest(counts, expected);

  // Monte-Carlo π: consecutive byte pairs as points in the unit square.
  let inside = 0, pairs = 0;
  for (let i = 0; i + 1 < n; i += 2) {
    const x = bytes[i] / 255, y = bytes[i + 1] / 255;
    pairs += 1;
    if (x * x + y * y <= 1) inside += 1;
  }
  const piEstimate = pairs ? (4 * inside) / pairs : NaN;

  // Lag-1 serial correlation (circular, as in ENT).
  let s1 = 0, s2 = 0, s3 = 0;
  for (let i = 0; i < n; i++) {
    const a = bytes[i], b = bytes[(i + 1) % n];
    s1 += a * b; s2 += a; s3 += a * a;
  }
  const num = n * s1 - s2 * s2;
  const den = n * s3 - s2 * s2;
  const serialCorrelation = den === 0 ? NaN : num / den;

  return { entropy, chi2, chi2P: p, mean: sum / n, piEstimate, serialCorrelation };
}

/** Histogram helper: bin values from [0, 1) into k equal bins. */
export function histogram01(values, k) {
  const bins = new Array(k).fill(0);
  for (const v of values) {
    const i = Math.min(k - 1, Math.floor(v * k));
    bins[i] += 1;
  }
  return bins;
}
