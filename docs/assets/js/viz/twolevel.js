/* viz/twolevel.js — Dieharder's verdict machine, run live: repeat a
 * first-level test, KS-test the batch of p-values, and watch the verdict
 * move from PASSED through WEAK to FAILED as evidence accumulates.
 *
 * Used by dieharder.html § The p-value-of-p-values approach; see README.md
 * § Layout.
 *
 * First level: a chi-square frequency test on 2000 bits from a coin with
 * P(1) = p. Second level: the empirical CDF of the accumulated p-values
 * against the Uniform[0,1) diagonal, scored by the KS statistic
 * (stats.js § ksUniformTest) with dieharder-style thresholds
 * (p < 10⁻⁶ FAILED, p < 0.005 WEAK). The point Brown's design makes:
 * a marginal defect that yields an ambiguous single p-value becomes an
 * unambiguous second-level failure once enough repeats are aggregated —
 * so when the verdict is ambiguous, you don't squint, you raise the
 * repeat count.
 */
import { biasedBits } from "../prng.js";
import { chiSquareTest, ksUniformTest } from "../stats.js";
import { mountCanvas } from "./common.js";

const N_BITS = 2000;      // bits per first-level test
const MAX_REPS = 800;
const CHUNK = 10;         // first-level tests per animation frame

const VERDICT = (p) =>
  p < 1e-6 ? ["FAILED", "bad"] :
  p < 0.005 ? ["WEAK", "series4"] :
  ["PASSED", "good"];

export default function init(figure) {
  const controls = figure.querySelector(".controls");
  controls.innerHTML = `
    <label>bias P(1) = <output class="bias-out">0.505</output>
      <input class="bias" type="range" min="0.500" max="0.515" step="0.001" value="0.505"></label>
    <label>repeats <select class="reps">
      <option>50</option><option selected>200</option><option>800</option>
    </select></label>
    <button class="rerun" type="button">re-run</button>
    <output class="status"></output>`;
  const biasEl = controls.querySelector(".bias");
  const biasOut = controls.querySelector(".bias-out");
  const repsEl = controls.querySelector(".reps");
  const status = controls.querySelector(".status");

  let pvalues = [], target = 200, run = 0, bit = null, raf = 0;
  let ks = { d: 0, p: 1, at: 0 };

  const { redraw } = mountCanvas(figure.querySelector(".plot"), 0.5,
    (ctx, w, h, c) => {
      const pad = { l: 44, r: 14, t: 16, b: 30 };
      const x0 = pad.l, x1 = w - pad.r, y0 = h - pad.b, y1 = pad.t;
      const X = (v) => x0 + v * (x1 - x0);
      const Y = (v) => y0 - v * (y0 - y1);

      // frame + diagonal (the uniform CDF)
      ctx.strokeStyle = c.grid;
      ctx.lineWidth = 1;
      ctx.strokeRect(x0, y1, x1 - x0, y0 - y1);
      ctx.strokeStyle = c.ink2;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(X(0), Y(0));
      ctx.lineTo(X(1), Y(1));
      ctx.stroke();
      ctx.setLineDash([]);

      // ECDF staircase of the accumulated p-values
      if (pvalues.length) {
        const sorted = [...pvalues].sort((a, b) => a - b);
        ctx.strokeStyle = c.accent;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(X(0), Y(0));
        sorted.forEach((v, i) => {
          ctx.lineTo(X(v), Y(i / sorted.length));
          ctx.lineTo(X(v), Y((i + 1) / sorted.length));
        });
        ctx.lineTo(X(1), Y(1));
        ctx.stroke();

        // highlight the largest gap D at its location
        const ecdfAt = sorted.filter((v) => v <= ks.at).length / sorted.length;
        ctx.strokeStyle = c.bad;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(X(ks.at), Y(ks.at));
        ctx.lineTo(X(ks.at), Y(ecdfAt));
        ctx.stroke();
        ctx.fillStyle = c.ink2;
        ctx.font = "11px system-ui, sans-serif";
        ctx.textAlign = ks.at < 0.7 ? "left" : "right";
        ctx.textBaseline = "middle";
        ctx.fillText(` D = ${ks.d.toFixed(3)} `,
          X(ks.at) + (ks.at < 0.7 ? 4 : -4), Y((ks.at + ecdfAt) / 2));
      }

      // axis labels
      ctx.fillStyle = c.muted;
      ctx.font = "11px system-ui, sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "top";
      ctx.fillText("first-level p-value", (x0 + x1) / 2, y0 + 8);
      ctx.textAlign = "left";
      ctx.fillText("0", x0, y0 + 8);
      ctx.textAlign = "right";
      ctx.fillText("1", x1, y0 + 8);
      ctx.save();
      ctx.translate(12, (y0 + y1) / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = "center"; ctx.textBaseline = "top";
      ctx.fillText("ECDF", 0, 0);
      ctx.restore();

      // verdict banner
      const [verdict, colorKey] = VERDICT(ks.p);
      ctx.font = "600 13px system-ui, sans-serif";
      ctx.textAlign = "right"; ctx.textBaseline = "top";
      ctx.fillStyle = { bad: c.bad, good: c.good, series4: c.series4 }[colorKey];
      ctx.fillText(`${verdict}  (2nd-level p = ${ks.p.toExponential(2)})`,
        x1 - 6, y1 + 4);
    });

  function step() {
    for (let t = 0; t < CHUNK && pvalues.length < target; t++) {
      let ones = 0;
      for (let i = 0; i < N_BITS; i++) ones += bit();
      pvalues.push(chiSquareTest([ones, N_BITS - ones], [N_BITS / 2, N_BITS / 2]).p);
    }
    ks = ksUniformTest(pvalues);
    status.textContent = `${pvalues.length}/${target} first-level tests`;
    redraw();
    if (pvalues.length < target) raf = requestAnimationFrame(step);
  }

  function restart() {
    cancelAnimationFrame(raf);
    const p = parseFloat(biasEl.value);
    biasOut.textContent = p.toFixed(3);
    target = Math.min(MAX_REPS, parseInt(repsEl.value, 10));
    bit = biasedBits(p, 13 + Math.round(p * 1000) * 17 + target + run * 499);
    pvalues = [];
    ks = { d: 0, p: 1, at: 0 };
    raf = requestAnimationFrame(step);
  }

  biasEl.addEventListener("input", restart);
  repsEl.addEventListener("change", restart);
  controls.querySelector(".rerun").addEventListener("click", () => { run += 1; restart(); });
  restart();
}
