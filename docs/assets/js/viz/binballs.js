/* viz/binballs.js — balls into bins: a SHA-256 digest as 32 bins, one per
 * byte position, receiving set bits as the balls.
 *
 * Used by hashing.html § Collision statistics and the birthday bound; see
 * README.md § Layout. Mirrors the unit test in tests/stats.test.mjs
 * ("SHA-256 spreads set bits evenly over its 32 byte bins"), and hashes
 * the same messages, so the figure and the test can be read side by side.
 *
 * N counter messages are hashed with real SHA-256 (crypto.subtle — no
 * dependency, but it is async, hence the token guard). Bin b receives
 * Binomial(8N, ½) set bits under the null, so the figure plots each bin's
 * z-score (ones − 4N)/√(2N) as a diverging bar around zero, with ±2σ/±3σ
 * guides; Σz² is chi-square with 32 df and gives the verdict p-value.
 * The "bit pinned" source forces one digest bit high — the same defect the
 * unit test injects as its power check — and shows what rejection looks
 * like: one bin escapes the band and the p-value collapses.
 */
import { chi2PValue } from "../stats.js";
import { mountCanvas } from "./common.js";

const BINS = 32;

const POPCOUNT = new Uint8Array(256);
for (let i = 1; i < 256; i++) POPCOUNT[i] = POPCOUNT[i >> 1] + (i & 1);

/* Digests of the counter messages, computed once and reused across N
 * changes (digest i never changes — same messages as the unit test). */
const cache = [];
async function digests(n) {
  if (cache.length < n) {
    const enc = new TextEncoder();
    const jobs = [];
    for (let i = cache.length; i < n; i++) {
      jobs.push(crypto.subtle.digest(
        "SHA-256", enc.encode(`randtests balls-into-bins ${i}`)));
    }
    for (const buf of await Promise.all(jobs)) cache.push(new Uint8Array(buf));
  }
  return cache.slice(0, n);
}

export default function init(figure) {
  const controls = figure.querySelector(".controls");
  controls.innerHTML = `
    <label>digests N = <output class="n-out">2048</output>
      <input class="n" type="range" min="8" max="13" step="1" value="11"></label>
    <label>source
      <select class="src">
        <option value="sha256">SHA-256</option>
        <option value="pinned">SHA-256, one output bit pinned</option>
      </select></label>
    <output class="status"></output>`;
  const nEl = controls.querySelector(".n");
  const srcEl = controls.querySelector(".src");
  const nOut = controls.querySelector(".n-out");
  const status = controls.querySelector(".status");

  let ones = null;   // set-bit count per bin
  let trials = 0;    // bits thrown at each bin = 8N
  let zs = [];
  let verdict = "";
  let slots = [];    // bar geometry for hover hit-testing
  let token = 0;     // discard stale async recomputes

  async function recompute() {
    const my = ++token;
    const n = 2 ** parseInt(nEl.value, 10);
    nOut.textContent = n.toLocaleString();
    const ds = await digests(n);
    if (my !== token) return;

    ones = new Array(BINS).fill(0);
    const pinned = srcEl.value === "pinned";
    for (const d of ds) {
      for (let b = 0; b < BINS; b++) {
        ones[b] += POPCOUNT[b === 0 && pinned ? d[0] | 1 : d[b]];
      }
    }
    trials = 8 * n;
    const sigma = Math.sqrt(trials / 4);           // sd of Binomial(8N, ½)
    zs = ones.map((o) => (o - trials / 2) / sigma);
    const chi2 = zs.reduce((s, z) => s + z * z, 0);
    const p = chi2PValue(chi2, BINS);
    verdict = `χ² = ${chi2.toFixed(1)} (${BINS} df), p ${p < 1e-12
      ? "< 10⁻¹²" : "= " + p.toPrecision(2)} — ${p < 0.01
      ? "occupancy rejected" : "consistent with uniform occupancy"}`;
    status.textContent = verdict;
    redraw();
  }

  const { canvas, redraw } = mountCanvas(figure.querySelector(".plot"), 0.38,
    (ctx, w, h, c) => {
      if (!ones) return; // first paint precedes the first async recompute
      const pad = { l: 46, r: 16, t: 14, b: 30 };
      const x0 = pad.l, x1 = w - pad.r;
      const yTop = pad.t, yBot = h - pad.b, yc = (yTop + yBot) / 2;
      const zMax = Math.max(4.5, ...zs.map(Math.abs)) * 1.15;
      const yOf = (z) => yc - (z / zMax) * (yBot - yTop) / 2;

      // ±2σ and ±3σ guides, labeled on the axis (site-style dashed reference lines).
      ctx.font = "11px system-ui, sans-serif";
      ctx.textAlign = "right"; ctx.textBaseline = "middle";
      for (const g of [2, 3]) {
        for (const s of [g, -g]) {
          const y = yOf(s);
          ctx.strokeStyle = c.grid;
          ctx.setLineDash([4, 4]);
          ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = c.muted;
          ctx.fillText(`${s > 0 ? "+" : "−"}${g}σ`, x0 - 6, y);
        }
      }
      ctx.strokeStyle = c.baseline;
      ctx.beginPath(); ctx.moveTo(x0, yc); ctx.lineTo(x1, yc); ctx.stroke();
      ctx.fillStyle = c.muted;
      ctx.fillText("0", x0 - 6, yc);

      const slotW = (x1 - x0) / BINS;
      const barW = Math.min(24, slotW - 2);
      slots = [];
      let worst = 0;
      for (let b = 0; b < BINS; b++) if (Math.abs(zs[b]) > Math.abs(zs[worst])) worst = b;

      for (let b = 0; b < BINS; b++) {
        const z = zs[b];
        const cx = x0 + slotW * (b + 0.5);
        const yEnd = yOf(z);
        const top = Math.min(yc, yEnd), bh = Math.max(Math.abs(yc - yEnd), 1);
        ctx.fillStyle = Math.abs(z) > 3 ? c.bad : c.accent;
        ctx.beginPath();
        // 4px rounded corners at the data end, square at the zero baseline
        ctx.roundRect(cx - barW / 2, top, barW, bh,
          z >= 0 ? [4, 4, 0, 0] : [0, 0, 4, 4]);
        ctx.fill();
        slots.push({ x: cx - slotW / 2, w: slotW, b });
        if (b % 4 === 0 || b === BINS - 1) {
          ctx.fillStyle = c.muted;
          ctx.textAlign = "center"; ctx.textBaseline = "top";
          ctx.fillText(String(b), cx, yBot + 6);
        }
      }

      // direct-label only the extreme bin
      const zW = zs[worst];
      ctx.fillStyle = c.ink2;
      ctx.font = "600 11px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = zW >= 0 ? "bottom" : "top";
      ctx.fillText((zW >= 0 ? "+" : "−") + Math.abs(zW).toFixed(1) + "σ",
        x0 + slotW * (worst + 0.5), yOf(zW) + (zW >= 0 ? -4 : 4));

      ctx.fillStyle = c.muted;
      ctx.font = "11px system-ui, sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "top";
      ctx.fillText("bin = digest byte position", (x0 + x1) / 2, h - 13);
    });

  // Hover: per-bin readout in the status line (canvas, so no CSS tooltip).
  canvas.addEventListener("mousemove", (ev) => {
    if (!ones) return;
    const x = ev.offsetX;
    const s = slots.find((t) => x >= t.x && x < t.x + t.w);
    if (!s) { status.textContent = verdict; return; }
    const b = s.b;
    status.textContent = `bin ${b}: ${ones[b].toLocaleString()} of ${
      trials.toLocaleString()} bits set (expected ${
      (trials / 2).toLocaleString()}), z = ${zs[b] >= 0 ? "+" : "−"}${
      Math.abs(zs[b]).toFixed(2)}`;
  });
  canvas.addEventListener("mouseleave", () => { status.textContent = verdict; });

  nEl.addEventListener("input", recompute);
  srcEl.addEventListener("change", recompute);
  recompute();
}
