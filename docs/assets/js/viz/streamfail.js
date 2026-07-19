/* viz/streamfail.js — PractRand's question, answered live: how many bits
 * does it take to break this generator?
 *
 * Used by practrand.html § The unbounded-stream philosophy; see README.md
 * § Layout.
 *
 * A monobit statistic is tracked over a growing stream from a coin with
 * bias ε = P(1) − ½, and re-evaluated at doubling checkpoints (PractRand's
 * scheme). The evidence −log₁₀(p) climbs along a predictable ramp:
 * z ≈ 2ε√n, so evidence grows linearly in n and quartering the defect
 * costs 16× the data. Verdicts escalate PractRand-style from "unusual"
 * through "suspicious" to FAIL — and a defect small enough to survive the
 * demo's 2²² -bit cap illustrates the other half of the philosophy: no
 * finite cap certifies anything, it only bounds the defects you can rule
 * out. (PractRand's real cap is 32 TB; this demo's is four million bits.)
 */
import { biasedBits } from "../prng.js";
import { normalTwoSidedP } from "../stats.js";
import { mountCanvas, yGrid } from "./common.js";

const START_LOG2 = 10;      // first checkpoint: 2^10 bits
const END_LOG2 = 22;        // stream cap: 2^22 = 4,194,304 bits
const CHUNK = 65536;        // bits consumed per animation frame

/* PractRand-flavoured verdict ladder on |z|. */
const grade = (z) =>
  z < 3 ? ["", null] :
  z < 4 ? ["unusual", "muted"] :
  z < 5 ? ["mildly suspicious", "series4"] :
  z < 6 ? ["VERY SUSPICIOUS", "series4"] :
  ["FAIL !!", "bad"];

export default function init(figure) {
  const controls = figure.querySelector(".controls");
  controls.innerHTML = `
    <label>defect ε = P(1) − ½ : <select class="eps">
      <option value="0">0 (perfect coin)</option>
      <option value="0.0005">+0.0005</option>
      <option value="0.001" selected>+0.001</option>
      <option value="0.002">+0.002</option>
      <option value="0.004">+0.004</option>
    </select></label>
    <button class="rerun" type="button">re-stream</button>
    <output class="status"></output>`;
  const epsEl = controls.querySelector(".eps");
  const status = controls.querySelector(".status");

  let bit = null, run = 0, ones = 0, n = 0, nextCkpt = 0, raf = 0;
  let points = [];   // {log2n, z, p, verdict}
  let failed = false;

  const { redraw } = mountCanvas(figure.querySelector(".plot"), 0.48,
    (ctx, w, h, c) => {
      const pad = { l: 46, r: 120, t: 14, b: 30 };
      const x0 = pad.l, x1 = w - pad.r, y0 = h - pad.b, y1 = pad.t;
      const PMAX = 12;   // y-axis: −log10(p) from 0 to 12
      const X = (l2) => x0 + ((l2 - START_LOG2) / (END_LOG2 - START_LOG2)) * (x1 - x0);
      const Y = (nlp) => y0 - (Math.min(nlp, PMAX) / PMAX) * (y0 - y1);

      yGrid(ctx, { x0, x1, y0, y1 },
        [0, 0.25, 0.5, 0.75, 1].map((f) => ({ frac: f, value: PMAX * f })),
        (v) => v.toFixed(0), c);

      // verdict bands
      const zBand = (zLo, nlpOf) => Y(nlpOf);
      const bands = [
        [3, "unusual"], [4, "mildly susp."], [5, "very susp."], [6, "FAIL"],
      ];
      ctx.font = "10px system-ui, sans-serif";
      ctx.textAlign = "left"; ctx.textBaseline = "middle";
      for (const [z, label] of bands) {
        const nlp = -Math.log10(normalTwoSidedP(z));
        ctx.strokeStyle = z >= 6 ? c.bad : c.grid;
        ctx.setLineDash([3, 4]);
        ctx.beginPath();
        ctx.moveTo(x0, Y(nlp));
        ctx.lineTo(x1, Y(nlp));
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = z >= 6 ? c.bad : c.muted;
        ctx.fillText(`|z|=${z} ${label}`, x1 + 6, Y(nlp));
      }

      // evidence trajectory at checkpoints
      ctx.strokeStyle = c.accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      points.forEach((pt, i) => {
        const x = X(pt.log2n), y = Y(pt.nlp);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke();
      points.forEach((pt) => {
        const [, colorKey] = grade(Math.abs(pt.z));
        ctx.fillStyle = colorKey === "bad" ? c.bad :
          colorKey === "series4" ? c.series4 : c.accent;
        ctx.beginPath();
        ctx.arc(X(pt.log2n), Y(pt.nlp), 4, 0, 2 * Math.PI);
        ctx.fill();
      });

      // x-axis: checkpoint sizes
      ctx.fillStyle = c.muted;
      ctx.font = "10px system-ui, sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "top";
      for (let l2 = START_LOG2; l2 <= END_LOG2; l2 += 2) {
        const bits = 2 ** l2;
        const label = bits >= 2 ** 20 ? `${bits / 2 ** 20}M` :
          bits >= 1024 ? `${bits / 1024}K` : bits;
        ctx.fillText(label, X(l2), y0 + 6);
      }
      ctx.fillText("stream length (bits, doubling checkpoints)", (x0 + x1) / 2, y0 + 17);
      ctx.save();
      ctx.translate(12, (y0 + y1) / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = "center";
      ctx.fillText("evidence  −log₁₀(p)", 0, 0);
      ctx.restore();
    });

  function step() {
    const target = Math.min(nextCkpt, 2 ** END_LOG2);
    let budget = CHUNK;
    while (n < target && budget-- > 0) { ones += bit(); n += 1; }
    if (n >= target) {
      const z = (2 * ones - n) / Math.sqrt(n);
      const p = normalTwoSidedP(z);
      const nlp = p > 0 ? -Math.log10(p) : 12;
      const [verdict] = grade(Math.abs(z));
      points.push({ log2n: Math.log2(n), z, p, nlp });
      if (verdict === "FAIL !!" && !failed) {
        failed = true;
        status.textContent =
          `FAIL at ${(n / 1024).toFixed(0)}K bits (|z| = ${Math.abs(z).toFixed(1)})`;
      }
      nextCkpt *= 2;
    }
    if (!failed && n >= 2 ** END_LOG2) {
      const z = points[points.length - 1].z;
      status.textContent = Math.abs(z) < 3
        ? `survived ${2 ** (END_LOG2 - 20)}M bits clean — a longer stream would be needed`
        : `cap reached at "${grade(Math.abs(z))[0]}" — the trend says: keep streaming`;
    } else if (!failed) {
      status.textContent = `${(n / 1024).toFixed(0)}K bits streamed…`;
    }
    redraw();
    if (n < 2 ** END_LOG2 && !failed) raf = requestAnimationFrame(step);
  }

  function restart() {
    cancelAnimationFrame(raf);
    const eps = parseFloat(epsEl.value);
    bit = biasedBits(0.5 + eps, 41 + Math.round(eps * 10000) * 13 + run * 271);
    ones = 0; n = 0; nextCkpt = 2 ** START_LOG2;
    points = []; failed = false;
    status.textContent = "streaming…";
    raf = requestAnimationFrame(step);
  }

  epsEl.addEventListener("change", restart);
  controls.querySelector(".rerun").addEventListener("click", () => { run += 1; restart(); });
  restart();
}
