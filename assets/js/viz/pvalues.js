/* viz/pvalues.js — histogram of p-values from repeated chi-square tests.
 *
 * Used by foundations.html § Two-level testing; explained there and in
 * README.md § Visualizations.
 *
 * The experiment: run m = 1000 independent chi-square frequency tests, each
 * on n = 2000 bits from a coin with P(heads) = p, and histogram the m
 * p-values. For a fair coin the histogram is flat (p-values are uniform
 * under the null hypothesis); as bias grows the mass slides toward zero —
 * which is exactly what second-level tests like the NIST uniformity check
 * are built to detect [NIST SP 800-22 §4].
 */
import { biasedBits } from "../prng.js";
import { chiSquareTest, histogram01 } from "../stats.js";
import { mountCanvas, yGrid } from "./common.js";

const M = 1000;      // number of repeated tests
const N = 2000;      // bits per test
const BINS = 20;
const ALPHA = 0.01;

function simulate(p) {
  const bit = biasedBits(p, 7);
  const pvalues = new Array(M);
  for (let t = 0; t < M; t++) {
    let ones = 0;
    for (let i = 0; i < N; i++) ones += bit();
    const { p: pv } = chiSquareTest([ones, N - ones], [N / 2, N / 2]);
    pvalues[t] = pv;
  }
  return pvalues;
}

export default function init(figure) {
  const controls = figure.querySelector(".controls");
  const label = document.createElement("label");
  label.innerHTML =
    `coin bias P(1) = <select>
       <option value="0.5" selected>0.500 (fair)</option>
       <option value="0.51">0.510</option>
       <option value="0.52">0.520</option>
       <option value="0.54">0.540</option>
     </select>`;
  const out = document.createElement("output");
  controls.append(label, out);
  const select = label.querySelector("select");

  let pvalues = simulate(0.5);

  const { redraw } = mountCanvas(figure.querySelector(".plot"), 0.45,
    (ctx, w, h, c) => {
      const pad = { l: 44, r: 12, t: 12, b: 26 };
      const x0 = pad.l, x1 = w - pad.r, y0 = h - pad.b, y1 = pad.t;
      const bins = histogram01(pvalues, BINS);
      const yMax = Math.max(M / BINS * 2.5, ...bins) * 1.08;

      yGrid(ctx, { x0, x1, y0, y1 },
        [0, 0.25, 0.5, 0.75, 1].map((f) => ({ frac: f, value: yMax * f })),
        (v) => Math.round(v), c);

      // bars — thin marks with a 2px gap, rounded data-end
      const bw = (x1 - x0) / BINS;
      for (let i = 0; i < BINS; i++) {
        const bh = (bins[i] / yMax) * (y0 - y1);
        const x = x0 + i * bw + 1;
        ctx.fillStyle = i === 0 ? c.bad : c.accent; // first bin holds the rejections
        ctx.beginPath();
        ctx.roundRect(x, y0 - bh, bw - 2, bh, [4, 4, 0, 0]);
        ctx.fill();
      }

      // expected-count-per-bin line under H0
      const yExp = y0 - (M / BINS / yMax) * (y0 - y1);
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
      ctx.fillText(`uniform expectation (${M / BINS}/bin)`, x1 - 4, yExp - 3);

      // x-axis labels
      ctx.fillStyle = c.muted;
      ctx.textBaseline = "top";
      ctx.textAlign = "left";
      ctx.fillText("0", x0, y0 + 6);
      ctx.textAlign = "center";
      ctx.fillText("p-value", (x0 + x1) / 2, y0 + 6);
      ctx.textAlign = "right";
      ctx.fillText("1", x1, y0 + 6);
    });

  function update() {
    pvalues = simulate(parseFloat(select.value));
    const rejected = pvalues.filter((v) => v < ALPHA).length;
    out.textContent =
      `rejections at α = ${ALPHA}: ${rejected} of ${M} ` +
      `(expected ≈ ${Math.round(M * ALPHA)} for a fair coin)`;
    redraw();
  }
  select.addEventListener("change", update);
  update();
}
