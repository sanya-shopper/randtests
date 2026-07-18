/* viz/walk.js — random-walk excursions and the arcsine law.
 *
 * Used by nist-sts.html § Random walks (cusum, random excursions); see
 * README.md § Visualizations.
 *
 * Left panel: five ±1 random walks of 4000 steps. Intuition says a fair
 * walk should hug zero; in fact long one-sided excursions are the norm.
 * Right panel: histogram, over 3000 walks, of the fraction of time each
 * walk spends above zero. The limit is the arcsine distribution — density
 * piled up at 0 and 1, *lowest* at ½ [Feller 1968]. Tests like NIST's
 * random excursions must use this counterintuitive null distribution.
 */
import { mulberry32 } from "../prng.js";
import { mountCanvas } from "./common.js";

const STEPS = 4000;
const WALKS_SHOWN = 5;
const WALKS_HIST = 3000;
const HBINS = 20;

function makeWalk(seed) {
  const u = mulberry32(seed);
  const s = new Int16Array(STEPS + 1);
  for (let i = 1; i <= STEPS; i++) s[i] = s[i - 1] + (u() < 0.5 ? -1 : 1);
  return s;
}

function positiveFractionHistogram() {
  const bins = new Array(HBINS).fill(0);
  for (let w = 0; w < WALKS_HIST; w++) {
    const u = mulberry32(1000 + w);
    let s = 0, pos = 0;
    for (let i = 0; i < STEPS; i++) {
      s += u() < 0.5 ? -1 : 1;
      // time above zero; split ties by previous side, cheap convention
      if (s > 0 || (s === 0 && pos > 0)) pos += 1;
    }
    const frac = pos / STEPS;
    bins[Math.min(HBINS - 1, Math.floor(frac * HBINS))] += 1;
  }
  return bins;
}

/** Arcsine density f(x) = 1/(π·sqrt(x(1−x))), integrated per bin
 *  via the closed-form CDF F(x) = (2/π)·asin(sqrt(x)). */
function arcsineBinProbability(i) {
  const F = (x) => (2 / Math.PI) * Math.asin(Math.sqrt(x));
  return F((i + 1) / HBINS) - F(i / HBINS);
}

export default function init(figure) {
  const walks = [];
  for (let i = 0; i < WALKS_SHOWN; i++) walks.push(makeWalk(11 + i));
  const hist = positiveFractionHistogram();

  mountCanvas(figure.querySelector(".plot"), 0.42, (ctx, w, h, c) => {
    const gap = 28;
    const leftW = Math.round(w * 0.56);
    drawWalks(ctx, 0, 0, leftW, h, c);
    drawArcsine(ctx, leftW + gap, 0, w - leftW - gap, h, c);
  });

  function drawWalks(ctx, ox, oy, w, h, c) {
    const pad = { l: 30, r: 6, t: 14, b: 22 };
    const x0 = ox + pad.l, x1 = ox + w - pad.r;
    const yMid = oy + (h - pad.b + pad.t) / 2;
    let maxAbs = 1;
    for (const s of walks) for (let i = 0; i <= STEPS; i++) {
      if (Math.abs(s[i]) > maxAbs) maxAbs = Math.abs(s[i]);
    }
    const yScale = (h - pad.t - pad.b) / 2 / maxAbs;

    ctx.strokeStyle = c.baseline;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x0, yMid); ctx.lineTo(x1, yMid); ctx.stroke();

    const colors = [c.accent, c.series2, c.series3, c.series4, c.muted];
    walks.forEach((s, k) => {
      ctx.strokeStyle = colors[k % colors.length];
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i <= STEPS; i += 4) {
        const x = x0 + ((x1 - x0) * i) / STEPS;
        const y = yMid - s[i] * yScale;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    });

    ctx.fillStyle = c.ink2;
    ctx.font = "11px system-ui, sans-serif";
    ctx.textAlign = "left"; ctx.textBaseline = "top";
    ctx.fillText(`${WALKS_SHOWN} random walks, ${STEPS} steps`, x0, oy + 1);
    ctx.fillStyle = c.muted;
    ctx.textBaseline = "bottom";
    ctx.fillText("Sₖ", ox + 4, yMid - 4);
    ctx.textAlign = "center";
    ctx.fillText("k →", (x0 + x1) / 2, oy + h - 4);
  }

  function drawArcsine(ctx, ox, oy, w, h, c) {
    const pad = { l: 8, r: 8, t: 14, b: 22 };
    const x0 = ox + pad.l, x1 = ox + w - pad.r;
    const y0 = oy + h - pad.b, y1 = oy + pad.t;
    const expected = [];
    for (let i = 0; i < HBINS; i++) expected.push(arcsineBinProbability(i) * WALKS_HIST);
    const yMax = Math.max(...hist, ...expected) * 1.1;
    const bw = (x1 - x0) / HBINS;

    for (let i = 0; i < HBINS; i++) {
      const bh = (hist[i] / yMax) * (y0 - y1);
      ctx.fillStyle = c.accent;
      ctx.beginPath();
      ctx.roundRect(x0 + i * bw + 1, y0 - bh, bw - 2, bh, [3, 3, 0, 0]);
      ctx.fill();
    }
    // arcsine expectation as a stepped line
    ctx.strokeStyle = c.ink2;
    ctx.setLineDash([4, 3]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < HBINS; i++) {
      const y = y0 - (expected[i] / yMax) * (y0 - y1);
      ctx.lineTo(x0 + i * bw, y);
      ctx.lineTo(x0 + (i + 1) * bw, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = c.baseline;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y0); ctx.stroke();

    ctx.fillStyle = c.ink2;
    ctx.font = "11px system-ui, sans-serif";
    ctx.textAlign = "left"; ctx.textBaseline = "top";
    ctx.fillText("fraction of time above 0", x0, oy + 1);
    ctx.fillStyle = c.muted;
    ctx.textAlign = "left"; ctx.textBaseline = "bottom";
    ctx.fillText("0", x0, y0 + 16);
    ctx.textAlign = "center";
    ctx.fillText("½", (x0 + x1) / 2, y0 + 16);
    ctx.textAlign = "right";
    ctx.fillText("1", x1, y0 + 16);
  }
}
