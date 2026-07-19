/* viz/walk.js — random-walk excursions and the arcsine law, animated.
 *
 * Used by nist-sts.html § Random walks (cusum, random excursions); see
 * README.md § Layout.
 *
 * Left panel: five ±1 random walks of 4000 steps, drawn step by step —
 * watch how long a fair walk lingers on one side of zero. Replay them, or
 * deal fresh ones (each deal is deterministic: seeds derive from the deal
 * number). Right panel: streaming in behind the animation, 3000 whole
 * walks are summarised by the fraction of time each spent above zero; the
 * histogram converges to the arcsine distribution — piled at 0 and 1,
 * *lowest* at ½ [Feller 1968] — which is the counterintuitive null that
 * NIST's cusum and random-excursions tests are calibrated against.
 */
import { mulberry32 } from "../prng.js";
import { theme } from "./common.js";

const STEPS = 4000;
const WALKS_SHOWN = 5;
const WALKS_HIST = 3000;
const HBINS = 20;
const DRAW_STEP = 50;    // walk steps revealed per frame (left panel)
const HIST_CHUNK = 40;   // whole walks summarised per frame (right panel)

function makeWalk(seed) {
  const u = mulberry32(seed);
  const s = new Int16Array(STEPS + 1);
  for (let i = 1; i <= STEPS; i++) s[i] = s[i - 1] + (u() < 0.5 ? -1 : 1);
  return s;
}

function positiveFraction(seed) {
  const u = mulberry32(seed);
  let s = 0, pos = 0;
  for (let i = 0; i < STEPS; i++) {
    s += u() < 0.5 ? -1 : 1;
    if (s > 0 || (s === 0 && pos > 0)) pos += 1;
  }
  return pos / STEPS;
}

/** Arcsine density integrated per bin via F(x) = (2/π)·asin(√x). */
function arcsineBinProbability(i) {
  const F = (x) => (2 / Math.PI) * Math.asin(Math.sqrt(x));
  return F((i + 1) / HBINS) - F(i / HBINS);
}

export default function init(figure) {
  const controls = figure.querySelector(".controls");
  controls.innerHTML = `
    <button class="replay" type="button">replay</button>
    <button class="deal" type="button">deal new walks</button>
    <output class="status"></output>`;
  const status = controls.querySelector(".status");

  let deal = 0;                       // bumps seeds deterministically
  let walks = [];
  let progress = 0;                   // steps revealed in the left panel
  let hist = new Array(HBINS).fill(0);
  let histDone = 0;
  let raf = 0;

  const parent = figure.querySelector(".plot");
  const canvas = document.createElement("canvas");
  parent.appendChild(canvas);
  const ctx = canvas.getContext("2d");

  function draw() {
    const w = parent.clientWidth ? parent.clientWidth - 2 : 640;
    const h = Math.round(w * 0.42);
    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr; canvas.height = h * dpr;
    canvas.style.width = w + "px"; canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const c = theme();
    ctx.clearRect(0, 0, w, h);
    const gap = 28;
    const leftW = Math.round(w * 0.56);
    drawWalks(ctx, 0, 0, leftW, h, c);
    drawArcsine(ctx, leftW + gap, 0, w - leftW - gap, h, c);
  }

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
      const limit = Math.min(progress, STEPS);
      for (let i = 0; i <= limit; i += 4) {
        const x = x0 + ((x1 - x0) * i) / STEPS;
        const y = yMid - s[i] * yScale;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
      // a marker at the walk's leading edge while animating
      if (limit < STEPS) {
        const x = x0 + ((x1 - x0) * limit) / STEPS;
        ctx.fillStyle = colors[k % colors.length];
        ctx.beginPath();
        ctx.arc(x, yMid - s[limit] * yScale, 2.5, 0, 2 * Math.PI);
        ctx.fill();
      }
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
    for (let i = 0; i < HBINS; i++) {
      expected.push(arcsineBinProbability(i) * Math.max(histDone, 1));
    }
    const yMax = Math.max(...hist, ...expected, 1) * 1.1;
    const bw = (x1 - x0) / HBINS;

    for (let i = 0; i < HBINS; i++) {
      if (!hist[i]) continue;
      const bh = (hist[i] / yMax) * (y0 - y1);
      ctx.fillStyle = c.accent;
      ctx.beginPath();
      ctx.roundRect(x0 + i * bw + 1, y0 - bh, bw - 2, bh, [3, 3, 0, 0]);
      ctx.fill();
    }
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

  function step() {
    let busy = false;
    if (progress < STEPS) { progress += DRAW_STEP; busy = true; }
    if (histDone < WALKS_HIST) {
      for (let r = 0; r < HIST_CHUNK && histDone < WALKS_HIST; r++, histDone++) {
        const frac = positiveFraction(1000 + deal * 7919 + histDone);
        hist[Math.min(HBINS - 1, Math.floor(frac * HBINS))] += 1;
      }
      busy = true;
    }
    status.textContent = histDone < WALKS_HIST
      ? `summarising walk ${histDone}/${WALKS_HIST} for the histogram…`
      : `${WALKS_HIST} walks summarised`;
    draw();
    if (busy) raf = requestAnimationFrame(step);
  }

  function start({ fresh }) {
    cancelAnimationFrame(raf);
    if (fresh) {
      deal += 1;
      hist = new Array(HBINS).fill(0);
      histDone = 0;
    }
    walks = [];
    for (let i = 0; i < WALKS_SHOWN; i++) walks.push(makeWalk(11 + deal * 101 + i));
    progress = 0;
    raf = requestAnimationFrame(step);
  }

  controls.querySelector(".replay").addEventListener("click", () => start({ fresh: false }));
  controls.querySelector(".deal").addEventListener("click", () => start({ fresh: true }));
  new ResizeObserver(draw).observe(parent);
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", draw);
  start({ fresh: false });
}
