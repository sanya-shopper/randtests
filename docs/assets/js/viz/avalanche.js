/* viz/avalanche.js — avalanche matrices of a weak and a strong 32-bit mixer.
 *
 * Used by hashing.html § The avalanche effect and SAC; see README.md
 * § Visualizations.
 *
 * For each input bit i of a 32-bit → 32-bit function, flip bit i in T
 * random inputs and record how often each output bit j flips. Under the
 * Strict Avalanche Criterion every cell of the resulting 32×32 matrix
 * should be ½ [Webster & Tavares 1985]. Cells are shaded by bias
 * |2·p̂ − 1|: near-white = ideal, dark = badly biased.
 *
 * Left: bare multiplication by a constant — upper output bits mix, but an
 * output bit can never depend on higher input bits (carries only propagate
 * upward), so the lower-left triangle is dead. Right: MurmurHash3's fmix32
 * finalizer, whose xor-shift/multiply rounds spread every input bit into
 * every output bit.
 */
import { mulberry32 } from "../prng.js";
import { theme } from "./common.js";

const T = 400; // samples per input bit

const weakMix = (x) => Math.imul(x, 2654435761) >>> 0;   // Knuth-style multiply only

function fmix32(x) {                                     // MurmurHash3 finalizer
  x >>>= 0;
  x ^= x >>> 16; x = Math.imul(x, 0x85ebca6b);
  x ^= x >>> 13; x = Math.imul(x, 0xc2b2ae35);
  x ^= x >>> 16;
  return x >>> 0;
}

/** 32×32 matrix of flip probabilities: rows = input bit, cols = output bit. */
function avalancheMatrix(f, seed) {
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
  const out = document.createElement("output");
  figure.querySelector(".controls").append(
    Object.assign(document.createElement("span"),
      { textContent: "hover a cell to read its flip probability" }),
    out);

  const matrices = [
    { name: "x · 2654435761 (multiply only)", m: avalancheMatrix(weakMix, 3) },
    { name: "murmur3 fmix32", m: avalancheMatrix(fmix32, 3) },
  ];

  const parent = figure.querySelector(".plot");
  const canvas = document.createElement("canvas");
  parent.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  let geom = null; // cell geometry for hover lookup

  function draw() {
    const w = parent.clientWidth ? parent.clientWidth - 2 : 640;
    const gap = 26, top = 22, bottom = 30;
    const cell = Math.max(3, Math.floor((w - gap) / 64 / 1.0));
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
      ctx.fillStyle = c.muted;
      ctx.fillText("output bit →", ox, top + gridW + 6);
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
        out.textContent =
          `${matrices[k].name}: input bit ${i} → output bit ${j} flips ` +
          `${(100 * p).toFixed(1)}% of the time (ideal 50%)`;
        return;
      }
    }
  });

  new ResizeObserver(draw).observe(parent);
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", draw);
  draw();
}
