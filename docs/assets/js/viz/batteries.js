/* viz/batteries.js — how much data each suite consumes, on a log scale.
 *
 * Used by testu01.html § The batteries in context; see README.md
 * § Visualizations.
 *
 * Approximate input appetite of each battery, in bytes. These are order-of-
 * magnitude figures for orientation, not benchmarks; the page text cites
 * the primary sources for each: Diehard's ~11 MB input file
 * [Marsaglia 1995], NIST's customary 1000 × 10⁶-bit configuration
 * [NIST SP 800-22], Crush/BigCrush's ≈2³⁵/2³⁸ 32-bit values
 * [L'Ecuyer & Simard 2007], PractRand's default 32 TB cap
 * [Doty-Humphrey, PractRand].
 */
import { mountCanvas } from "./common.js";

const SUITES = [
  { name: "ENT (any file)", bytes: 64 * 1024, note: "whatever you give it" },
  { name: "Diehard", bytes: 11e6, note: "fixed ~11 MB file" },
  { name: "NIST SP 800-22", bytes: 1000 * 1e6 / 8, note: "1000 × 10⁶ bits" },
  { name: "SmallCrush", bytes: 2 ** 27 * 4, note: "quick screen" },
  { name: "Crush", bytes: 2 ** 35 * 4, note: "≈ 2³⁵ values" },
  { name: "BigCrush", bytes: 2 ** 38 * 4, note: "≈ 2³⁸ values" },
  { name: "PractRand (max)", bytes: 32 * 2 ** 40, note: "default 32 TB cap" },
];

const fmtBytes = (b) => {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  while (b >= 1000 && i < units.length - 1) { b /= 1000; i += 1; }
  return `${b >= 100 ? Math.round(b) : b.toPrecision(2)} ${units[i]}`;
};

export default function init(figure) {
  mountCanvas(figure.querySelector(".plot"), 0.52, (ctx, w, h, c) => {
    const pad = { l: 130, r: 76, t: 10, b: 28 };
    const x0 = pad.l, x1 = w - pad.r;
    const rowH = (h - pad.t - pad.b) / SUITES.length;
    const logMin = Math.log10(1e4), logMax = Math.log10(64e12);
    const xOf = (bytes) =>
      x0 + ((Math.log10(bytes) - logMin) / (logMax - logMin)) * (x1 - x0);

    // vertical decade gridlines
    ctx.strokeStyle = c.grid;
    ctx.fillStyle = c.muted;
    ctx.lineWidth = 1;
    ctx.font = "10px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (let d = 6; d <= 13; d += 1) {
      const x = xOf(10 ** d);
      ctx.beginPath();
      ctx.moveTo(x, pad.t);
      ctx.lineTo(x, h - pad.b);
      ctx.stroke();
      ctx.fillText(fmtBytes(10 ** d), x, h - pad.b + 6);
    }

    ctx.textBaseline = "middle";
    SUITES.forEach((s, i) => {
      const y = pad.t + i * rowH + rowH / 2;
      const xEnd = xOf(s.bytes);
      ctx.fillStyle = c.accent;
      ctx.beginPath();
      ctx.roundRect(x0, y - 5, Math.max(4, xEnd - x0), 10, [0, 4, 4, 0]);
      ctx.fill();
      ctx.fillStyle = c.ink2;
      ctx.font = "12px system-ui, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(s.name, x0 - 8, y);
      ctx.textAlign = "left";
      ctx.font = "11px system-ui, sans-serif";
      ctx.fillText(fmtBytes(s.bytes), xEnd + 6, y);
    });
  });
}
