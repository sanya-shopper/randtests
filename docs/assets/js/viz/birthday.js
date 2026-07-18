/* viz/birthday.js — the birthday-spacings test, run live.
 *
 * Used by diehard.html § Birthday spacings; see README.md § Visualizations.
 *
 * The test [Marsaglia 1985; Knuth 1997 §3.3.2]: drop n = 1024 "birthdays"
 * uniformly on a year of m = 2²⁴ days, sort them, take the n spacings
 * between neighbours, and count K = how many spacing values occur more than
 * once. For true randomness K is asymptotically Poisson with
 * λ = n³/(4m) = 16. We run 400 replications each for a well-behaved
 * generator and for a defective LCG whose two lowest output bits are stuck
 * (see prng.js § weakLcg24): its outputs live on a grid of step 4, the
 * effective year shrinks to m′ = 2²², and K jumps toward n³/4m′ = 64 —
 * a four-sigma-a-replication failure the histogram makes obvious.
 */
import { mulberry32, weakLcg24 } from "../prng.js";
import { lnGamma } from "../stats.js";
import { mountCanvas, yGrid } from "./common.js";

const N = 1024;          // birthdays per replication
const M = 2 ** 24;       // days in the year
const REPS = 400;
const LAMBDA = (N ** 3) / (4 * M);   // = 16

function countDuplicateSpacings(draw) {
  const days = new Uint32Array(N);
  for (let i = 0; i < N; i++) days[i] = draw();
  days.sort();
  const spacings = new Uint32Array(N - 1);
  for (let i = 1; i < N; i++) spacings[i - 1] = days[i] - days[i - 1];
  spacings.sort();
  let dup = 0;
  for (let i = 1; i < N - 1; i++) if (spacings[i] === spacings[i - 1]) dup += 1;
  return dup;
}

function replicate(makeDraw) {
  const counts = [];
  for (let r = 0; r < REPS; r++) counts.push(countDuplicateSpacings(makeDraw(r)));
  return counts;
}

const poissonPmf = (k, lambda) =>
  Math.exp(k * Math.log(lambda) - lambda - lnGamma(k + 1));

export default function init(figure) {
  const good = replicate((r) => {
    const u = mulberry32(500 + r);
    return () => Math.floor(u() * M);
  });
  const bad = replicate((r) => weakLcg24(9000 + 2 * r + 1));

  const KMAX = 90;
  const toBins = (counts) => {
    const bins = new Array(KMAX + 1).fill(0);
    for (const k of counts) bins[Math.min(k, KMAX)] += 1;
    return bins;
  };
  const goodBins = toBins(good), badBins = toBins(bad);

  mountCanvas(figure.querySelector(".plot"), 0.45, (ctx, w, h, c) => {
    const pad = { l: 40, r: 12, t: 20, b: 30 };
    const x0 = pad.l, x1 = w - pad.r, y0 = h - pad.b, y1 = pad.t;
    const yMax = Math.max(...goodBins, ...badBins, REPS * poissonPmf(16, LAMBDA)) * 1.15;
    const bw = (x1 - x0) / (KMAX + 1);

    yGrid(ctx, { x0, x1, y0, y1 },
      [0, 0.5, 1].map((f) => ({ frac: f, value: yMax * f })),
      (v) => Math.round(v), c);

    const bar = (bins, color, offset) => {
      ctx.fillStyle = color;
      for (let k = 0; k <= KMAX; k++) {
        if (!bins[k]) continue;
        const bh = (bins[k] / yMax) * (y0 - y1);
        ctx.beginPath();
        ctx.roundRect(x0 + k * bw + offset, y0 - bh, bw / 2 - 1, bh, [2, 2, 0, 0]);
        ctx.fill();
      }
    };
    bar(goodBins, c.accent, 1);
    bar(badBins, c.bad, bw / 2);

    // Poisson(λ=16) expectation curve
    ctx.strokeStyle = c.ink2;
    ctx.setLineDash([4, 3]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let k = 0; k <= KMAX; k++) {
      const y = y0 - (REPS * poissonPmf(k, LAMBDA) / yMax) * (y0 - y1);
      const x = x0 + (k + 0.5) * bw;
      k === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // axis + legend
    ctx.fillStyle = c.muted;
    ctx.font = "11px system-ui, sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    for (let k = 0; k <= KMAX; k += 15) ctx.fillText(k, x0 + (k + 0.5) * bw, y0 + 6);
    ctx.fillText("K = duplicate spacings per replication", (x0 + x1) / 2, y0 + 18);

    ctx.textAlign = "left"; ctx.textBaseline = "middle";
    const legend = [
      [c.accent, "mulberry32 (matches Poisson λ=16)"],
      [c.bad, "LCG with 2 stuck low bits (far right: K ≈ 4×)"],
      [c.ink2, "Poisson(16) expectation"],
    ];
    let lx = x0 + 8, ly = y1 - 1;
    for (const [color, text] of legend) {
      const width = 15 + ctx.measureText(text).width + 18;
      if (lx + width > x1 && lx > x0 + 8) { lx = x0 + 8; ly += 14; }
      ctx.fillStyle = color;
      ctx.fillRect(lx, ly - 5, 10, 10);
      ctx.fillStyle = c.ink2;
      ctx.fillText(text, lx + 15, ly);
      lx += width;
    }
  });
}
