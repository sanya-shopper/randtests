/* viz/pvalues.js — histogram of p-values from repeated chi-square tests,
 * accumulated live as the tests run.
 *
 * Used by foundations.html § Two-level testing; explained there and in
 * README.md § Layout.
 *
 * The experiment: run chi-square frequency tests, each on n bits from a
 * coin with P(1) = p, and histogram the p-values as they stream in. For a
 * fair coin the histogram settles flat (p-values are uniform under the
 * null); as bias grows the mass slides into the leftmost bin — exactly
 * what second-level tests like the NIST uniformity check detect
 * [NIST SP 800-22 §4]. The bias slider and bits-per-test selector let you
 * find the detection frontier yourself: small n hides a bias that huge n
 * makes unmissable, because power grows with sample size.
 *
 * Determinism: each run's generator seed is derived from (bias, n, run#),
 * so a given control setting always replays the same experiment.
 */
import { biasedBits } from "../prng.js";
import { chiSquareTest, histogram01 } from "../stats.js";
import { mountCanvas, yGrid } from "./common.js";

const M = 1000;         // tests per full run
const BINS = 20;
const ALPHA = 0.01;
const CHUNK = 40;       // tests simulated per animation frame

export default function init(figure) {
  const controls = figure.querySelector(".controls");
  controls.innerHTML = `
    <label>bias P(1) = <output class="bias-out">0.500</output>
      <input class="bias" type="range" min="0.500" max="0.560" step="0.002" value="0.500"></label>
    <label>bits/test <select class="nbits">
      <option>500</option><option selected>2000</option><option>8000</option><option>32000</option>
    </select></label>
    <button class="rerun" type="button">re-run</button>
    <output class="status"></output>`;
  const biasEl = controls.querySelector(".bias");
  const biasOut = controls.querySelector(".bias-out");
  const nEl = controls.querySelector(".nbits");
  const status = controls.querySelector(".status");

  let pvalues = [];       // accumulates as the animation runs
  let run = 0;            // bumped by re-run for a fresh (deterministic) seed
  let bit = null, done = 0, raf = 0;

  const { redraw } = mountCanvas(figure.querySelector(".plot"), 0.45,
    (ctx, w, h, c) => {
      const pad = { l: 44, r: 12, t: 12, b: 26 };
      const x0 = pad.l, x1 = w - pad.r, y0 = h - pad.b, y1 = pad.t;
      const bins = histogram01(pvalues, BINS);
      const yMax = Math.max(M / BINS * 2.5, ...bins) * 1.08;

      yGrid(ctx, { x0, x1, y0, y1 },
        [0, 0.25, 0.5, 0.75, 1].map((f) => ({ frac: f, value: yMax * f })),
        (v) => Math.round(v), c);

      const bw = (x1 - x0) / BINS;
      for (let i = 0; i < BINS; i++) {
        if (!bins[i]) continue;
        const bh = (bins[i] / yMax) * (y0 - y1);
        ctx.fillStyle = i === 0 ? c.bad : c.accent; // first bin holds the rejections
        ctx.beginPath();
        ctx.roundRect(x0 + i * bw + 1, y0 - bh, bw - 2, bh, [4, 4, 0, 0]);
        ctx.fill();
      }

      // expected-count-per-bin line under H0, scaled to tests-so-far
      const yExp = y0 - (pvalues.length / BINS / yMax) * (y0 - y1);
      ctx.strokeStyle = c.ink2;
      ctx.setLineDash([5, 4]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x0, yExp);
      ctx.lineTo(x1, yExp);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = c.ink2;
      ctx.font = "11px system-ui, sans-serif";
      ctx.textAlign = "right";
      ctx.textBaseline = "bottom";
      ctx.fillText("uniform expectation", x1 - 4, yExp - 3);

      ctx.fillStyle = c.muted;
      ctx.textBaseline = "top";
      ctx.textAlign = "left";
      ctx.fillText("0", x0, y0 + 6);
      ctx.textAlign = "center";
      ctx.fillText("p-value", (x0 + x1) / 2, y0 + 6);
      ctx.textAlign = "right";
      ctx.fillText("1", x1, y0 + 6);
    });

  function step() {
    const n = parseInt(nEl.value, 10);
    for (let t = 0; t < CHUNK && done < M; t++, done++) {
      let ones = 0;
      for (let i = 0; i < n; i++) ones += bit();
      pvalues.push(chiSquareTest([ones, n - ones], [n / 2, n / 2]).p);
    }
    const rejected = pvalues.filter((v) => v < ALPHA).length;
    status.textContent =
      `${pvalues.length}/${M} tests · rejections at α=${ALPHA}: ${rejected} ` +
      `(≈${Math.round(pvalues.length * ALPHA)} expected if fair)`;
    redraw();
    if (done < M) raf = requestAnimationFrame(step);
  }

  function restart() {
    cancelAnimationFrame(raf);
    const p = parseFloat(biasEl.value);
    biasOut.textContent = p.toFixed(3);
    // seed derived from the controls + run counter → reproducible runs
    const seed = 7 + Math.round(p * 1000) * 31 + parseInt(nEl.value, 10) + run * 977;
    bit = biasedBits(p, seed);
    pvalues = [];
    done = 0;
    raf = requestAnimationFrame(step);
  }

  biasEl.addEventListener("input", restart);
  nEl.addEventListener("change", restart);
  controls.querySelector(".rerun").addEventListener("click", () => { run += 1; restart(); });
  restart();
}
