/* viz/randu3d.js — RANDU's fifteen planes, drawn live.
 *
 * Used by classical.html § The spectral test and RANDU; see README.md
 * § Visualizations.
 *
 * Plots consecutive triples (uₖ, uₖ₊₁, uₖ₊₂) from IBM's RANDU inside the
 * unit cube. Because x_{k+2} ≡ 6·x_{k+1} − 9·x_k (mod 2³¹), every triple
 * satisfies 9u₁ − 6u₂ + u₃ ∈ ℤ, confining all points to 15 parallel planes
 * [Marsaglia 1968; Knuth 1997 §3.3.4]. Drag to rotate; from most angles the
 * cloud looks fine — the planes only snap into view edge-on, which is the
 * visual analogue of why weak tests miss lattice structure and the spectral
 * test does not. The toggle swaps in a well-behaved generator for contrast.
 */
import { randu, mulberry32 } from "../prng.js";
import { theme } from "./common.js";

const POINTS = 3500;

function triples(nextU) {
  const pts = new Float64Array(POINTS * 3);
  let a = nextU(), b = nextU();
  for (let i = 0; i < POINTS; i++) {
    const c = nextU();
    pts[i * 3] = a; pts[i * 3 + 1] = b; pts[i * 3 + 2] = c;
    a = b; b = c;
  }
  return pts;
}

export default function init(figure) {
  const controls = figure.querySelector(".controls");
  const label = document.createElement("label");
  label.innerHTML =
    `generator <select>
       <option value="randu" selected>RANDU (defective)</option>
       <option value="good">mulberry32 (well-behaved)</option>
     </select>`;
  const hint = document.createElement("span");
  hint.textContent = "drag to rotate — find the angle where the planes appear";
  controls.append(label, hint);
  const select = label.querySelector("select");

  const data = {
    randu: triples(randu(1)),
    good: triples(mulberry32(42)),
  };

  const parent = figure.querySelector(".plot");
  const canvas = document.createElement("canvas");
  parent.appendChild(canvas);
  const ctx = canvas.getContext("2d");

  // Start near the revealing orientation but not exactly on it, so the
  // reader gets the "snap" moment themselves.
  let rotY = 0.55, rotX = -0.35;
  let dragging = false, lastX = 0, lastY = 0;

  function draw() {
    const w = parent.clientWidth ? parent.clientWidth - 2 : 640;
    const h = Math.round(w * 0.62);
    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr; canvas.height = h * dpr;
    canvas.style.width = w + "px"; canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const c = theme();
    ctx.clearRect(0, 0, w, h);

    const cy = Math.cos(rotY), sy = Math.sin(rotY);
    const cx = Math.cos(rotX), sx = Math.sin(rotX);
    const scale = Math.min(w, h) * 0.62;
    const ox = w / 2, oy = h / 2;

    const project = (x, y, z) => {
      // center cube, rotate about Y then X, orthographic projection
      const X = x - 0.5, Y = y - 0.5, Z = z - 0.5;
      const x1 = X * cy + Z * sy;
      const z1 = -X * sy + Z * cy;
      const y1 = Y * cx - z1 * sx;
      const z2 = Y * sx + z1 * cx;
      return [ox + x1 * scale, oy - y1 * scale, z2];
    };

    // cube edges
    ctx.strokeStyle = c.grid;
    ctx.lineWidth = 1;
    const corners = [];
    for (let i = 0; i < 8; i++) corners.push(project(i & 1, (i >> 1) & 1, (i >> 2) & 1));
    for (let i = 0; i < 8; i++) for (const bit of [1, 2, 4]) {
      const j = i ^ bit;
      if (j > i) {
        ctx.beginPath();
        ctx.moveTo(corners[i][0], corners[i][1]);
        ctx.lineTo(corners[j][0], corners[j][1]);
        ctx.stroke();
      }
    }

    const pts = data[select.value];
    const color = select.value === "randu" ? c.bad : c.accent;
    for (let i = 0; i < POINTS; i++) {
      const [px, py, pz] = project(pts[i * 3], pts[i * 3 + 1], pts[i * 3 + 2]);
      const depth = 0.35 + 0.65 * (pz + 0.87) / 1.74; // cheap depth cue
      ctx.globalAlpha = Math.max(0.15, Math.min(1, depth));
      ctx.fillStyle = color;
      ctx.fillRect(px - 1, py - 1, 2, 2);
    }
    ctx.globalAlpha = 1;
  }

  canvas.addEventListener("pointerdown", (e) => {
    dragging = true; lastX = e.clientX; lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    rotY += (e.clientX - lastX) * 0.008;
    rotX += (e.clientY - lastY) * 0.008;
    rotX = Math.max(-1.5, Math.min(1.5, rotX));
    lastX = e.clientX; lastY = e.clientY;
    draw();
  });
  canvas.addEventListener("pointerup", () => { dragging = false; });
  canvas.style.touchAction = "none";
  canvas.style.cursor = "grab";

  select.addEventListener("change", draw);
  new ResizeObserver(draw).observe(parent);
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", draw);
  draw();
}
