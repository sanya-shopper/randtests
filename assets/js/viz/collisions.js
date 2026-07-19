/* viz/collisions.js — the birthday bound as an experiment: expected vs
 * observed collisions for real mixing functions.
 *
 * Used by hashing.html § Collision statistics and the birthday bound; see
 * README.md § Layout.
 *
 * Hash the counter keys 0…n−1 into 2^b buckets (top b bits of a 32-bit
 * hash) and count colliding pairs, against the birthday expectation
 * E[C] = n(n−1)/2^(b+1). Three hashers: a true random oracle (mulberry32,
 * ignoring the key), murmur3's fmix32, and multiply-only Fibonacci
 * hashing. The lesson runs in *both* directions: fmix32 tracks the
 * expectation like the oracle does, while the multiplicative hash of a
 * counter produces far too FEW collisions — beautifully even, therefore
 * visibly non-random. Distribution suites flag both tails; a hash-table
 * implementer might happily keep the "too few" one, which is exactly the
 * difference between "statistically random" and "fit for purpose".
 */
import { mulberry32 } from "../prng.js";
import { mountCanvas, yGrid } from "./common.js";

function fmix32(x) {
  x >>>= 0;
  x ^= x >>> 16; x = Math.imul(x, 0x85ebca6b);
  x ^= x >>> 13; x = Math.imul(x, 0xc2b2ae35);
  x ^= x >>> 16;
  return x >>> 0;
}

const HASHERS = [
  { key: "oracle", label: "random oracle" },
  { key: "fmix32", label: "murmur3 fmix32" },
  { key: "mul", label: "x · 2654435761" },
];

/** Count colliding pairs when keys 0…n−1 land in 2^b buckets.
 *  Σ over buckets of C(load, 2), accumulated incrementally. */
function collisionCount(hashFn, n, b) {
  const shift = 32 - b;
  const loads = new Map();
  let pairs = 0;
  for (let i = 0; i < n; i++) {
    const bucket = hashFn(i) >>> shift;
    const seen = loads.get(bucket) || 0;
    pairs += seen;               // new key collides with each occupant
    loads.set(bucket, seen + 1);
  }
  return pairs;
}

export default function init(figure) {
  const controls = figure.querySelector(".controls");
  controls.innerHTML = `
    <label>keys n = 2^<output class="n-out">14</output>
      <input class="n" type="range" min="10" max="16" step="1" value="14"></label>
    <label>buckets 2^<output class="b-out">20</output>
      <input class="b" type="range" min="16" max="26" step="1" value="20"></label>
    <output class="status"></output>`;
  const nEl = controls.querySelector(".n");
  const bEl = controls.querySelector(".b");
  const nOut = controls.querySelector(".n-out");
  const bOut = controls.querySelector(".b-out");
  const status = controls.querySelector(".status");

  let results = [];   // aligned with HASHERS
  let expected = 0;

  function recompute() {
    const nBits = parseInt(nEl.value, 10);
    const b = parseInt(bEl.value, 10);
    nOut.textContent = nBits;
    bOut.textContent = b;
    const n = 2 ** nBits;
    expected = (n * (n - 1)) / 2 ** (b + 1);
    const u = mulberry32(77);
    const fns = {
      oracle: () => Math.floor(u() * 4294967296) >>> 0,
      fmix32,
      mul: (x) => Math.imul(x, 2654435761) >>> 0,
    };
    results = HASHERS.map(({ key }) => collisionCount(fns[key], n, b));
    status.textContent =
      `birthday expectation E[C] = n(n−1)/2^(b+1) = ${expected < 10
        ? expected.toFixed(2) : Math.round(expected).toLocaleString()}`;
    redraw();
  }

  const { redraw } = mountCanvas(figure.querySelector(".plot"), 0.4,
    (ctx, w, h, c) => {
      if (results.length !== HASHERS.length) return; // first paint precedes recompute()
      const pad = { l: 46, r: 16, t: 18, b: 40 };
      const x0 = pad.l, x1 = w - pad.r, y0 = h - pad.b, y1 = pad.t;
      const yMax = Math.max(expected, ...results, 4) * 1.2;

      yGrid(ctx, { x0, x1, y0, y1 },
        [0, 0.5, 1].map((f) => ({ frac: f, value: yMax * f })),
        (v) => (yMax >= 100 ? Math.round(v).toLocaleString() : v.toFixed(1)), c);

      const colWidth = (x1 - x0) / HASHERS.length;
      const barW = Math.min(80, colWidth * 0.5);
      const colors = [c.muted, c.accent, c.bad];
      HASHERS.forEach((hsr, i) => {
        const cx = x0 + colWidth * (i + 0.5);
        const bh = (results[i] / yMax) * (y0 - y1);
        ctx.fillStyle = colors[i];
        ctx.beginPath();
        ctx.roundRect(cx - barW / 2, y0 - Math.max(bh, 1), barW,
          Math.max(bh, 1), [4, 4, 0, 0]);
        ctx.fill();
        ctx.fillStyle = c.ink2;
        ctx.font = "12px system-ui, sans-serif";
        ctx.textAlign = "center"; ctx.textBaseline = "top";
        ctx.fillText(hsr.label, cx, y0 + 8);
        ctx.font = "600 11px system-ui, sans-serif";
        ctx.textBaseline = "bottom";
        ctx.fillText(results[i].toLocaleString(), cx, y0 - Math.max(bh, 1) - 3);
      });

      // expectation line
      const yE = y0 - (expected / yMax) * (y0 - y1);
      ctx.strokeStyle = c.ink2;
      ctx.setLineDash([5, 4]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x0, yE);
      ctx.lineTo(x1, yE);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = c.ink2;
      ctx.font = "11px system-ui, sans-serif";
      ctx.textAlign = "left"; ctx.textBaseline = "bottom";
      ctx.fillText("birthday expectation", x0 + 4, yE - 3);
    });

  nEl.addEventListener("input", recompute);
  bEl.addEventListener("input", recompute);
  recompute();
}
