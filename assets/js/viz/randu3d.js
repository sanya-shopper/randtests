/* viz/randu3d.js — RANDU's fifteen planes, drawn live.
 *
 * Used by classical.html § The spectral test and RANDU; see README.md
 * § Layout.
 *
 * Plots consecutive triples (uₖ, uₖ₊₁, uₖ₊₂) from IBM's RANDU inside the
 * unit cube. Because x_{k+2} ≡ 6·x_{k+1} − 9·x_k (mod 2³¹), every triple
 * satisfies 9u₁ − 6u₂ + u₃ ∈ ℤ, confining all points to 15 parallel planes
 * [Marsaglia 1968; Knuth 1997 §3.3.4].
 *
 * Exploration: the cube slowly spins on its own; drag to steer it, slide
 * the density up to add points, and when you give up hunting by hand, the
 * "reveal the planes" button *computes* the edge-on orientation from the
 * plane normal (9, −6, 1) and animates the camera onto it — the visual
 * equivalent of what the spectral test does by algebra. Toggle to a
 * well-behaved generator and press reveal again: no orientation shows
 * stripes, because there are none to show.
 */
import { randu, mulberry32 } from "../prng.js";
import { theme } from "./common.js";

const MAX_POINTS = 12000;

function triples(nextU, count) {
  const pts = new Float64Array(count * 3);
  let a = nextU(), b = nextU();
  for (let i = 0; i < count; i++) {
    const c = nextU();
    pts[i * 3] = a; pts[i * 3 + 1] = b; pts[i * 3 + 2] = c;
    a = b; b = c;
  }
  return pts;
}

/** The camera tilt that shows RANDU's planes edge-on. draw() rotates by
 *  rotY about Y then rotX about X and projects along z, so the planes are
 *  edge-on when the rotated plane normal n = (9, −6, 1) has zero
 *  z-component: nY·sin(rotX) + z1·cos(rotX) = 0, where
 *  z1 = −nX·sin(rotY) + nZ·cos(rotY). Solved for rotX given any rotY. */
function revealTilt(rotY) {
  const nX = 9, nY = -6, nZ = 1;
  const z1 = -nX * Math.sin(rotY) + nZ * Math.cos(rotY);
  let rotX = Math.atan2(-z1, nY);
  while (rotX > Math.PI / 2) rotX -= Math.PI;   // fold into the clamp range;
  while (rotX < -Math.PI / 2) rotX += Math.PI;  // a ±π shift keeps z = 0
  return rotX;
}

export default function init(figure) {
  const controls = figure.querySelector(".controls");
  controls.innerHTML = `
    <label>generator <select class="gen">
      <option value="randu" selected>RANDU (defective)</option>
      <option value="good">mulberry32 (well-behaved)</option>
    </select></label>
    <label>points <output class="np-out">3500</output>
      <input class="np" type="range" min="500" max="${MAX_POINTS}" step="500" value="3500"></label>
    <button class="reveal" type="button">reveal the planes</button>
    <span class="hint">spins until you grab it — drag to steer</span>`;
  const genEl = controls.querySelector(".gen");
  const npEl = controls.querySelector(".np");
  const npOut = controls.querySelector(".np-out");

  const data = {
    randu: triples(randu(1), MAX_POINTS),
    good: triples(mulberry32(42), MAX_POINTS),
  };

  const parent = figure.querySelector(".plot");
  const canvas = document.createElement("canvas");
  parent.appendChild(canvas);
  const ctx = canvas.getContext("2d");

  let rotY = 0.55, rotX = -0.35;
  let spin = true;          // auto-rotate until first drag
  let anim = null;          // active reveal animation, or null
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

    const n = parseInt(npEl.value, 10);
    const pts = data[genEl.value];
    const color = genEl.value === "randu" ? c.bad : c.accent;
    for (let i = 0; i < n; i++) {
      const [px, py, pz] = project(pts[i * 3], pts[i * 3 + 1], pts[i * 3 + 2]);
      const depth = 0.35 + 0.65 * (pz + 0.87) / 1.74; // cheap depth cue
      ctx.globalAlpha = Math.max(0.15, Math.min(1, depth));
      ctx.fillStyle = color;
      ctx.fillRect(px - 1, py - 1, 2, 2);
    }
    ctx.globalAlpha = 1;
  }

  function tick() {
    if (anim) {
      const t = Math.min(1, (performance.now() - anim.t0) / 1200);
      const e = 1 - (1 - t) ** 3;   // ease-out cubic
      rotY = anim.fromY + (anim.toY - anim.fromY) * e;
      rotX = anim.fromX + (anim.toX - anim.fromX) * e;
      draw();
      if (t >= 1) anim = null;
    } else if (spin && !dragging) {
      rotY += 0.0035;
      draw();
    }
    requestAnimationFrame(tick);
  }

  canvas.addEventListener("pointerdown", (e) => {
    dragging = true; spin = false; anim = null;
    lastX = e.clientX; lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    rotY += (e.clientX - lastX) * 0.008;
    rotX = Math.max(-1.5, Math.min(1.5, rotX + (e.clientY - lastY) * 0.008));
    lastX = e.clientX; lastY = e.clientY;
    draw();
  });
  canvas.addEventListener("pointerup", () => { dragging = false; });
  canvas.style.touchAction = "none";
  canvas.style.cursor = "grab";

  controls.querySelector(".reveal").addEventListener("click", () => {
    spin = false;
    const toY = 0.9;                 // a pleasant viewing azimuth…
    const toX = revealTilt(toY);     // …with the exact edge-on tilt
    anim = { t0: performance.now(), fromY: rotY, fromX: rotX, toY, toX };
  });
  genEl.addEventListener("change", draw);
  npEl.addEventListener("input", () => { npOut.textContent = npEl.value; draw(); });

  new ResizeObserver(draw).observe(parent);
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", draw);
  draw();
  requestAnimationFrame(tick);
}
