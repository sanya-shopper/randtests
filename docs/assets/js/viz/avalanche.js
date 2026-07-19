/* viz/avalanche.js — avalanche matrices of selectable 32-bit mixers,
 * side by side.
 *
 * Used by hashing.html § The avalanche effect and SAC; see README.md
 * § Layout.
 *
 * For each input bit i of a 32-bit → 32-bit function, flip bit i in T
 * random inputs and record how often each output bit j flips. Under the
 * Strict Avalanche Criterion every cell of the resulting 32×32 matrix
 * should be ½ [Webster & Tavares 1985]. Cells are shaded by bias
 * |2·p̂ − 1|: near-white = ideal, dark = badly biased.
 *
 * Exploration: pick any two mixers to compare — from `+ constant` (almost
 * nothing avalanches) through bare multiply (carries only travel upward:
 * dead lower-left triangle) and bare xor-shift (only travels downward) to
 * MurmurHash3's fmix32, where alternating the two directions saturates
 * the matrix. The samples slider trades speed against measurement noise:
 * at low T even a perfect mixer looks mottled, which is the binomial
 * sampling error the page's chi-square machinery quantifies.
 */
import { mulberry32 } from "../prng.js";
import { theme } from "./common.js";

/* The mixer library. Each entry is a genuinely instructive rung on the
 * ladder from "no mixing" to "full finalizer". */
const MIXERS = {
  addc: {
    label: "x + 0x9e3779b9 (add only)",
    fn: (x) => (x + 0x9e3779b9) >>> 0,
  },
  mul: {
    label: "x · 2654435761 (multiply only)",
    fn: (x) => Math.imul(x, 2654435761) >>> 0,
  },
  xsr: {
    label: "x ^= x⋙16 (xor-shift only)",
    fn: (x) => (x ^ (x >>> 16)) >>> 0,
  },
  round1: {
    label: "one round: xor-shift + multiply",
    fn: (x) => Math.imul(x ^ (x >>> 16), 0x85ebca6b) >>> 0,
  },
  fmix32: {
    label: "murmur3 fmix32 (full finalizer)",
    fn: (x) => {
      x >>>= 0;
      x ^= x >>> 16; x = Math.imul(x, 0x85ebca6b);
      x ^= x >>> 13; x = Math.imul(x, 0xc2b2ae35);
      x ^= x >>> 16;
      return x >>> 0;
    },
  },
};

/** 32×32 matrix of flip probabilities: rows = input bit, cols = output bit. */
function avalancheMatrix(f, seed, T) {
  const u = mulberry32(seed);
  const flips = Array.from({ length: 32 }, () => new Float64Array(32));
  for (let t = 0; t < T; t++) {
    const x = Math.floor(u() * 4294967296) >>> 0;
    const fx = f(x);
    for (let i = 0; i < 32; i++) {
      const delta = fx ^ f((x ^ (1 << i)) >>> 0);
      for (let j = 0; j < 32; j++) if ((delta >>> j) & 1) flips[i][j] += 1;
    }
  }
  for (const row of flips) for (let j = 0; j < 32; j++) row[j] /= T;
  return flips;
}

/* Sequential blue ramp (dataviz palette, steps 100→700): light = unbiased,
 * dark = bias 1. Interpolated in sRGB between anchor steps — adequate for a
 * ramp this short. */
const RAMP = ["#cde2fb", "#9ec5f4", "#6da7ec", "#3987e5", "#256abf", "#184f95", "#0d366b"];
function rampColor(bias) {
  const t = Math.min(1, bias) * (RAMP.length - 1);
  const i = Math.min(RAMP.length - 2, Math.floor(t));
  const f = t - i;
  const hex = (s) => [1, 3, 5].map((k) => parseInt(s.slice(k, k + 2), 16));
  const [r1, g1, b1] = hex(RAMP[i]), [r2, g2, b2] = hex(RAMP[i + 1]);
  const mix = (a, b) => Math.round(a + (b - a) * f);
  return `rgb(${mix(r1, r2)},${mix(g1, g2)},${mix(b1, b2)})`;
}

export default function init(figure) {
  const controls = figure.querySelector(".controls");
  const options = (sel) => Object.entries(MIXERS)
    .map(([k, m]) => `<option value="${k}" ${k === sel ? "selected" : ""}>${m.label}</option>`)
    .join("");
  controls.innerHTML = `
    <label>left <select class="left">${options("mul")}</select></label>
    <label>right <select class="right">${options("fmix32")}</select></label>
    <label>samples/bit <output class="t-out">400</output>
      <input class="t" type="range" min="50" max="2000" step="50" value="400"></label>
    <output class="readout">hover a cell to read its flip probability</output>`;
  const leftEl = controls.querySelector(".left");
  const rightEl = controls.querySelector(".right");
  const tEl = controls.querySelector(".t");
  const tOut = controls.querySelector(".t-out");
  const readout = controls.querySelector(".readout");

  let matrices = [];      // [{name, m}, {name, m}]
  let worst = [0, 0];     // worst-cell bias per panel
  let geom = null;        // cell geometry for hover lookup

  function recompute() {
    const T = parseInt(tEl.value, 10);
    tOut.textContent = T;
    matrices = [leftEl.value, rightEl.value].map((key) => ({
      name: MIXERS[key].label,
      m: avalancheMatrix(MIXERS[key].fn, 3, T),
    }));
    worst = matrices.map(({ m }) => {
      let w = 0;
      for (const row of m) for (const p of row) w = Math.max(w, Math.abs(2 * p - 1));
      return w;
    });
    draw();
  }

  const parent = figure.querySelector(".plot");
  const canvas = document.createElement("canvas");
  parent.appendChild(canvas);
  const ctx = canvas.getContext("2d");

  function draw() {
    const w = parent.clientWidth ? parent.clientWidth - 2 : 640;
    const gap = 26, top = 22, bottom = 34;
    const cell = Math.max(3, Math.floor((w - gap) / 64));
    const gridW = cell * 32;
    const h = top + gridW + bottom;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr; canvas.height = h * dpr;
    canvas.style.width = w + "px"; canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const c = theme();
    ctx.clearRect(0, 0, w, h);
    geom = { cell, top, origins: [] };

    matrices.forEach(({ name, m }, k) => {
      const ox = k * (gridW + gap);
      geom.origins.push(ox);
      for (let i = 0; i < 32; i++) for (let j = 0; j < 32; j++) {
        const bias = Math.abs(2 * m[i][j] - 1);
        ctx.fillStyle = rampColor(bias);
        ctx.fillRect(ox + j * cell, top + i * cell, cell - 0.5, cell - 0.5);
      }
      ctx.fillStyle = c.ink2;
      ctx.font = "11px system-ui, sans-serif";
      ctx.textAlign = "left"; ctx.textBaseline = "top";
      ctx.fillText(name, ox, 2);
      // Expected worst-cell bias for a PERFECT mixer at this T: the max of
      // 1024 |N(0, 1/√T)| draws ≈ 3.7/√T (Gaussian max approximation).
      // At or below that, the headline number is sampling noise, not bias.
      const T = parseInt(tEl.value, 10);
      const noise = 3.7 / Math.sqrt(T);
      const isNoise = worst[k] <= noise * 1.2;
      ctx.fillStyle = isNoise ? c.muted : c.bad;
      ctx.fillText(
        `worst cell bias ${(100 * worst[k]).toFixed(1)}%` +
        (isNoise ? ` (≈ sampling noise at T=${T})` : ""),
        ox, top + gridW + 6);
      ctx.fillStyle = c.muted;
      ctx.fillText("output bit →", ox, top + gridW + 19);
    });
    ctx.save();
    ctx.fillStyle = theme().muted;
    ctx.font = "11px system-ui, sans-serif";
    ctx.translate(10, top + gridW / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "center";
    ctx.fillText("input bit ↓", 0, 0);
    ctx.restore();
  }

  canvas.addEventListener("pointermove", (e) => {
    if (!geom) return;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left, py = e.clientY - rect.top;
    const i = Math.floor((py - geom.top) / geom.cell);
    for (let k = 0; k < matrices.length; k++) {
      const j = Math.floor((px - geom.origins[k]) / geom.cell);
      if (i >= 0 && i < 32 && j >= 0 && j < 32) {
        const p = matrices[k].m[i][j];
        readout.textContent =
          `${matrices[k].name}: input bit ${i} → output bit ${j} flips ` +
          `${(100 * p).toFixed(1)}% of the time (ideal 50%)`;
        return;
      }
    }
  });

  leftEl.addEventListener("change", recompute);
  rightEl.addEventListener("change", recompute);
  tEl.addEventListener("input", recompute);
  new ResizeObserver(draw).observe(parent);
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", draw);
  recompute();
}
