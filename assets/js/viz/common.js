/* viz/common.js — shared plumbing for every visualization module.
 *
 * Responsibilities (README.md § Visualizations):
 *  - theme(): read the site palette from CSS custom properties so charts
 *    always match style.css (single source of truth for color).
 *  - mountCanvas(): HiDPI-correct canvas sizing plus automatic redraw on
 *    container resize and on light/dark theme change.
 *
 * Every viz module follows the same contract: export default init(figure)
 * where `figure` is the <figure class="viz"> element to fill, and the page
 * calls it from a <script type="module"> block.
 */

/** Palette snapshot taken from the CSS custom properties on :root. */
export function theme() {
  const s = getComputedStyle(document.documentElement);
  const v = (name) => s.getPropertyValue(name).trim();
  return {
    surface:  v("--surface"),
    ink:      v("--ink"),
    ink2:     v("--ink-2"),
    muted:    v("--muted"),
    grid:     v("--grid"),
    baseline: v("--baseline"),
    accent:   v("--accent"),
    series2:  v("--series-2"),
    series3:  v("--series-3"),
    series4:  v("--series-4"),
    good:     v("--good"),
    bad:      v("--bad"),
  };
}

/** Create a canvas inside `parent`, sized to its width at the given aspect
 *  ratio, HiDPI-scaled. Calls draw(ctx, w, h, colors) immediately and again
 *  whenever the element resizes or the color scheme flips.
 *  Returns { canvas, redraw }. */
export function mountCanvas(parent, aspect, draw) {
  const canvas = document.createElement("canvas");
  parent.appendChild(canvas);
  const ctx = canvas.getContext("2d");

  function redraw() {
    const w = parent.clientWidth ? parent.clientWidth - 2 : 640;
    const h = Math.round(w * aspect);
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    draw(ctx, w, h, theme());
  }

  new ResizeObserver(() => redraw()).observe(parent);
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", redraw);
  redraw();
  return { canvas, redraw };
}

/** Draw a horizontal baseline and light y-gridlines with tick labels.
 *  Keeps axis chrome consistent — and recessive — across figures. */
export function yGrid(ctx, { x0, x1, y0, y1 }, ticks, fmt, colors) {
  ctx.strokeStyle = colors.grid;
  ctx.fillStyle = colors.muted;
  ctx.lineWidth = 1;
  ctx.font = "11px system-ui, sans-serif";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (const t of ticks) {
    const y = y0 + (y1 - y0) * t.frac;
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x1, y);
    ctx.stroke();
    ctx.fillText(fmt(t.value), x0 - 6, y);
  }
  ctx.strokeStyle = colors.baseline;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y0);
  ctx.stroke();
}
