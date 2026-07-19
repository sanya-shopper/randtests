/* viz/birthday.js — the birthday-spacings test, run live with a
 * defect-severity dial.
 *
 * Used by diehard.html § Birthday spacings; see README.md § Layout.
 *
 * The test [Marsaglia 1985; Knuth 1997 §3.3.2]: drop n = 1024 "birthdays"
 * uniformly on a year of m = 2²⁴ days, sort them, take the spacings
 * between neighbours, and count K = how many spacing values occur more
 * than once. For true randomness K is asymptotically Poisson with
 * λ = n³/(4m) = 16.
 *
 * Exploration: replications stream in live for two generators at once —
 * mulberry32, and an LCG whose s lowest output bits are stuck at zero
 * (prng.js § weakLcg24). The severity slider sets s: each stuck bit
 * halves the effective year, so theory predicts K ~ Poisson(2^s · 16),
 * and the red histogram walks rightward to meet the moving dashed curve
 * as you drag. At s = 0 the two generators are statistically
 * indistinguishable — which is itself the point.
 */
import { mulberry32, weakLcg24 } from "../prng.js";
import { lnGamma } from "../stats.js";
import { mountCanvas, yGrid } from "./common.js";

const N = 1024;          // birthdays per replication
const M = 2 ** 24;       // days in the year
const REPS = 400;        // replications per generator per run
const LAMBDA = (N ** 3) / (4 * M);   // = 16
const CHUNK = 8;         // replications per generator per animation frame

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

const poissonPmf = (k, lambda) =>
  Math.exp(k * Math.log(lambda) - lambda - lnGamma(k + 1));

export default function init(figure) {
  const controls = figure.querySelector(".controls");
  controls.innerHTML = `
    <label>stuck low bits <output class="s-out">2</output>
      <input class="s" type="range" min="0" max="3" step="1" value="2"></label>
    <span>→ defective generator's predicted λ′ =
      <output class="lam-out">64</output></span>
    <output class="status"></output>`;
  const sEl = controls.querySelector(".s");
  const sOut = controls.querySelector(".s-out");
  const lamOut = controls.querySelector(".lam-out");
  const status = controls.querySelector(".status");

  let goodBins = [], badBins = [], doneReps = 0, raf = 0, kmax = 60;

  const { redraw } = mountCanvas(figure.querySelector(".plot"), 0.45,
    (ctx, w, h, c) => {
      const s = parseInt(sEl.value, 10);
      const lamBad = LAMBDA * 2 ** s;
      const pad = { l: 40, r: 12, t: 20, b: 30 };
      const x0 = pad.l, x1 = w - pad.r, y0 = h - pad.b, y1 = pad.t;
      const yMax = Math.max(...goodBins, ...badBins,
        REPS * poissonPmf(Math.round(LAMBDA), LAMBDA)) * 1.15;
      const bw = (x1 - x0) / (kmax + 1);

      yGrid(ctx, { x0, x1, y0, y1 },
        [0, 0.5, 1].map((f) => ({ frac: f, value: yMax * f })),
        (v) => Math.round(v), c);

      const bar = (bins, color, offset) => {
        ctx.fillStyle = color;
        for (let k = 0; k <= kmax; k++) {
          if (!bins[k]) continue;
          const bh = (bins[k] / yMax) * (y0 - y1);
          ctx.beginPath();
          ctx.roundRect(x0 + k * bw + offset, y0 - bh,
            Math.max(1, bw / 2 - 1), bh, [2, 2, 0, 0]);
          ctx.fill();
        }
      };
      bar(goodBins, c.accent, 1);
      bar(badBins, c.bad, bw / 2);

      // Poisson expectation curves: λ = 16 for the honest generator, and
      // the slider-dependent λ′ prediction for the defective one.
      const curve = (lambda, color) => {
        ctx.strokeStyle = color;
        ctx.setLineDash([4, 3]);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let k = 0; k <= kmax; k++) {
          const y = y0 - (REPS * poissonPmf(k, lambda) / yMax) * (y0 - y1);
          const x = x0 + (k + 0.5) * bw;
          k === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      };
      curve(LAMBDA, c.ink2);
      if (s > 0) curve(lamBad, c.bad);

      // axis + legend
      ctx.fillStyle = c.muted;
      ctx.font = "11px system-ui, sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "top";
      const tick = kmax > 120 ? 30 : 15;
      for (let k = 0; k <= kmax; k += tick) ctx.fillText(k, x0 + (k + 0.5) * bw, y0 + 6);
      ctx.fillText("K = duplicate spacings per replication", (x0 + x1) / 2, y0 + 18);

      ctx.textAlign = "left"; ctx.textBaseline = "middle";
      const legend = [
        [c.accent, "mulberry32 · Poisson(16)"],
        [c.bad, s > 0 ? `LCG, ${s} stuck bit${s > 1 ? "s" : ""} · Poisson(${lamBad}) predicted`
                      : "LCG, no stuck bits — indistinguishable"],
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

  let makeGood = null, makeBad = null;

  function step() {
    for (let r = 0; r < CHUNK && doneReps < REPS; r++, doneReps++) {
      const kg = countDuplicateSpacings(makeGood(doneReps));
      const kb = countDuplicateSpacings(makeBad(doneReps));
      goodBins[Math.min(kg, kmax)] += 1;
      badBins[Math.min(kb, kmax)] += 1;
    }
    status.textContent = `${doneReps}/${REPS} replications per generator`;
    redraw();
    if (doneReps < REPS) raf = requestAnimationFrame(step);
  }

  function restart() {
    cancelAnimationFrame(raf);
    const s = parseInt(sEl.value, 10);
    const lamBad = LAMBDA * 2 ** s;
    sOut.textContent = s;
    lamOut.textContent = lamBad;
    // axis wide enough for the shifted distribution's upper tail
    kmax = Math.ceil((lamBad + 4 * Math.sqrt(lamBad) + 12) / 10) * 10;
    goodBins = new Array(kmax + 1).fill(0);
    badBins = new Array(kmax + 1).fill(0);
    doneReps = 0;
    makeGood = (r) => {
      const u = mulberry32(500 + r);
      return () => Math.floor(u() * M);
    };
    makeBad = (r) => weakLcg24(9000 + 2 * r + 1, s);
    raf = requestAnimationFrame(step);
  }

  sEl.addEventListener("input", restart);
  restart();
}
