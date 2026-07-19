/* viz/entlive.js — ENT's five statistics, computed live in the browser.
 *
 * Used by ent.html § ENT in action; see README.md § Layout.
 *
 * Runs the exact statistics ENT reports [Walker 2008] — entropy, chi-square
 * on byte frequencies, arithmetic mean, Monte-Carlo π, lag-1 serial
 * correlation (implemented in assets/js/stats.js § entStats) — over 64 KiB
 * from a selectable source, or over anything you type or paste yourself.
 *
 * Each row gets a verdict: the chi-square rule is ENT's own (suspect
 * outside 5–95%, near-certain failure outside 1–99%); the others use
 * rough tolerances sized to 64 KiB, marked in the table. The point the
 * page makes: ENT flags only gross defects — your prose fails everything,
 * a mildly biased coin gets caught by chi-square alone, and RANDU (the
 * catastrophically broken generator) sails through untouched.
 */
import { mulberry32, randu, biasedBits } from "../prng.js";
import { entStats } from "../stats.js";

const SIZE = 65536;

const SOURCES = {
  good: {
    label: "mulberry32 bytes",
    make() {
      const u = mulberry32(99);
      const b = new Uint8Array(SIZE);
      for (let i = 0; i < SIZE; i++) b[i] = Math.floor(u() * 256);
      return b;
    },
  },
  randu: {
    label: "RANDU, top byte",
    make() {
      const u = randu(1);
      const b = new Uint8Array(SIZE);
      for (let i = 0; i < SIZE; i++) b[i] = Math.floor(u() * 256);
      return b;
    },
  },
  biased: {
    label: "coin with P(1) = 0.52, packed to bytes",
    make() {
      const bit = biasedBits(0.52, 5);
      const b = new Uint8Array(SIZE);
      for (let i = 0; i < SIZE; i++) {
        let byte = 0;
        for (let k = 0; k < 8; k++) byte = (byte << 1) | bit();
        b[i] = byte;
      }
      return b;
    },
  },
  text: {
    label: "English text, repeated",
    make() {
      const s = "It is a truth universally acknowledged, that a single man " +
        "in possession of a good fortune, must be in want of a wife. ";
      return textBytes(s);
    },
  },
  custom: { label: "your own text (type below)", make: null },
};

function textBytes(s) {
  if (!s) s = " ";
  const b = new Uint8Array(SIZE);
  for (let i = 0; i < SIZE; i++) b[i] = s.charCodeAt(i % s.length) & 0xff;
  return b;
}

/* Verdict rules. chi2 follows ENT's published interpretation; the rest are
 * ±tolerances appropriate for 64 KiB of ideal bytes (≈3σ). */
const ROWS = [
  ["Entropy (bits/byte)", (r) => r.entropy.toFixed(4), "8.0",
    (r) => r.entropy > 7.98],
  ["Chi-square (255 df)", (r) => r.chi2.toFixed(1), "≈ 255",
    (r) => r.chi2P > 0.01 && r.chi2P < 0.99],
  ["…as a p-value", (r) => r.chi2P.toExponential(2), "not near 0 or 1",
    (r) => r.chi2P > 0.05 && r.chi2P < 0.95],
  ["Arithmetic mean", (r) => r.mean.toFixed(2), "127.5",
    (r) => Math.abs(r.mean - 127.5) < 1.0],
  ["Monte-Carlo π", (r) => r.piEstimate.toFixed(4), "≈ 3.1416",
    (r) => Math.abs(r.piEstimate - Math.PI) < 0.03],
  ["Serial correlation", (r) => r.serialCorrelation.toFixed(5), "≈ 0",
    (r) => Math.abs(r.serialCorrelation) < 0.012],
];

export default function init(figure) {
  const controls = figure.querySelector(".controls");
  const options = Object.entries(SOURCES)
    .map(([k, s]) => `<option value="${k}">${s.label}</option>`)
    .join("");
  controls.innerHTML = `
    <label>byte source <select class="src">${options}</select> (64 KiB)</label>
    <textarea class="custom" rows="2" placeholder="type or paste anything — it repeats to fill 64 KiB"
      style="display:none; width:100%; font:inherit;"></textarea>`;
  const select = controls.querySelector(".src");
  const custom = controls.querySelector(".custom");

  const table = document.createElement("table");
  table.innerHTML =
    `<thead><tr><th>Statistic</th><th class="num">Observed</th>
      <th class="num">Ideal</th><th>Verdict</th></tr></thead><tbody></tbody>`;
  figure.querySelector(".plot").appendChild(table);
  const tbody = table.querySelector("tbody");
  const summary = document.createElement("p");
  summary.style.cssText = "font-size:0.88rem; margin:0.4rem 0 0;";
  figure.querySelector(".plot").appendChild(summary);

  function update() {
    custom.style.display = select.value === "custom" ? "block" : "none";
    const bytes = select.value === "custom"
      ? textBytes(custom.value)
      : SOURCES[select.value].make();
    const r = entStats(bytes);
    let passes = 0;
    tbody.innerHTML = ROWS.map(([name, fmt, ideal, ok]) => {
      const good = ok(r);
      if (good) passes += 1;
      return `<tr><td>${name}</td><td class="num">${fmt(r)}</td>
        <td class="num">${ideal}</td>
        <td class="${good ? "pass" : "fail"}">${good ? "✓ ok" : "✗ flagged"}</td></tr>`;
    }).join("");
    summary.textContent = passes === ROWS.length
      ? "All five statistics look ideal — which proves only that ENT can't see whatever is wrong."
      : `${ROWS.length - passes} of ${ROWS.length} statistics flagged.`;
  }
  select.addEventListener("change", update);
  custom.addEventListener("input", update);
  update();
}
