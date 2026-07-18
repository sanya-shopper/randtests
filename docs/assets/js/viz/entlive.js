/* viz/entlive.js — ENT's five statistics, computed live in the browser.
 *
 * Used by ent.html § ENT in action; see README.md § Visualizations.
 *
 * Runs the exact statistics ENT reports [Walker 2008] — entropy, chi-square
 * on byte frequencies, arithmetic mean, Monte-Carlo π, lag-1 serial
 * correlation (implemented in assets/js/stats.js § entStats) — over 64 KiB
 * from a selectable source. The point the page makes: ENT flags only gross
 * defects. ASCII text fails everything; a mildly defective PRNG sails
 * through, which is why ENT is a smoke test rather than a suite.
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
      const b = new Uint8Array(SIZE);
      for (let i = 0; i < SIZE; i++) b[i] = s.charCodeAt(i % s.length);
      return b;
    },
  },
};

const ROWS = [
  ["Entropy (bits/byte)", (r) => r.entropy.toFixed(4), "8.0"],
  ["Chi-square (255 df)", (r) => r.chi2.toFixed(1), "≈ 255"],
  ["…as a p-value", (r) => r.chi2P.toExponential(2), "not near 0 or 1"],
  ["Arithmetic mean", (r) => r.mean.toFixed(2), "127.5"],
  ["Monte-Carlo π", (r) => r.piEstimate.toFixed(4), "≈ 3.1416"],
  ["Serial correlation", (r) => r.serialCorrelation.toFixed(5), "≈ 0"],
];

export default function init(figure) {
  const controls = figure.querySelector(".controls");
  const label = document.createElement("label");
  const options = Object.entries(SOURCES)
    .map(([k, s]) => `<option value="${k}">${s.label}</option>`)
    .join("");
  label.innerHTML = `byte source <select>${options}</select> (64 KiB)`;
  controls.append(label);
  const select = label.querySelector("select");

  const table = document.createElement("table");
  table.innerHTML =
    `<thead><tr><th>Statistic</th><th class="num">Observed</th>
      <th class="num">Ideal</th></tr></thead><tbody></tbody>`;
  figure.querySelector(".plot").appendChild(table);
  const tbody = table.querySelector("tbody");

  function update() {
    const r = entStats(SOURCES[select.value].make());
    tbody.innerHTML = ROWS.map(([name, fmt, ideal]) =>
      `<tr><td>${name}</td><td class="num">${fmt(r)}</td>
       <td class="num">${ideal}</td></tr>`).join("");
  }
  select.addEventListener("change", update);
  update();
}
