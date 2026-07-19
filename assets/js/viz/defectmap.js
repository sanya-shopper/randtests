/* viz/defectmap.js — the coverage map: which family of tests can see
 * which family of defects.
 *
 * Used by index.html § Which test sees which defect; see README.md
 * § Layout.
 *
 * Rendered as an HTML table (screen-readable, keyboard-focusable) rather
 * than a canvas. Every rating is a claim defended somewhere on the site —
 * hover (or focus) a cell and the reason appears below, with the page
 * that makes the argument linked in the row header. The two blank-looking
 * columns of the RANDU and Mersenne-Twister rows are the site's whole
 * thesis in miniature: an entire battery can be blind to a defect that a
 * single well-aimed test sees instantly.
 */

const STRONG = 2, PARTIAL = 1, BLIND = 0;

const TESTS = [
  { key: "freq", label: "Frequency", href: "nist-sts.html#tests" },
  { key: "serial", label: "Serial / poker / gap", href: "classical.html#catalog" },
  { key: "runs", label: "Runs", href: "classical.html#catalog" },
  { key: "dft", label: "DFT (spectral)", href: "nist-sts.html#tests" },
  { key: "bday", label: "Birthday spacings", href: "diehard.html#tests" },
  { key: "rank", label: "Rank / LinComp", href: "classical.html#linearity" },
  { key: "twolevel", label: "Two-level KS", href: "foundations.html#twolevel" },
  { key: "aval", label: "Avalanche / SAC", href: "hashing.html#avalanche" },
  { key: "coll", label: "Collision keysets", href: "hashing.html#collisions" },
];

/* Each defect: label, the page that discusses it, and per-test
 * [rating, reason]. Reasons are one line; the linked pages carry the
 * full argument. */
const DEFECTS = [
  {
    label: "Biased bits (P(1) ≠ ½)",
    href: "foundations.html#chisquare",
    cells: {
      freq: [STRONG, "counting ones is exactly this test"],
      serial: [PARTIAL, "detects it via tuple frequencies, less directly"],
      runs: [PARTIAL, "run counts shift with bias, with less power than counting"],
      dft: [BLIND, "a constant offset is not a periodic feature"],
      bday: [BLIND, "spacings ignore symbol frequencies"],
      rank: [BLIND, "bias barely moves bit-matrix ranks"],
      twolevel: [STRONG, "tiny bias tilts every first-level p-value; the batch condemns it"],
      aval: [BLIND, "tests the function, not the stream"],
      coll: [PARTIAL, "bucket counts skew, but far downstream of the cause"],
    },
  },
  {
    label: "Neighbour correlation",
    href: "classical.html#catalog",
    cells: {
      freq: [BLIND, "marginal frequencies can stay perfect"],
      serial: [STRONG, "pair/tuple frequencies are exactly what it counts"],
      runs: [STRONG, "correlation changes oscillation rate directly"],
      dft: [PARTIAL, "shows up if the correlation has periodic structure"],
      bday: [PARTIAL, "only via induced clustering"],
      rank: [BLIND, "unless the dependence is linear over GF(2)"],
      twolevel: [PARTIAL, "amplifies whichever first-level test feels it"],
      aval: [BLIND, "stream property, not a mapping property"],
      coll: [BLIND, "collisions counted per key set, not per neighbour"],
    },
  },
  {
    label: "Lattice planes (RANDU, LCGs)",
    href: "classical.html#randu",
    cells: {
      freq: [BLIND, "RANDU's frequencies are immaculate"],
      serial: [PARTIAL, "needs high-dimensional tuples at fine resolution"],
      runs: [BLIND, "local ordering looks fair"],
      dft: [BLIND, "planes are not periodicities of the 1-D stream"],
      bday: [STRONG, "lattice structure duplicates spacings — the designed target"],
      rank: [BLIND, "integer lattice ≠ GF(2) linearity"],
      twolevel: [PARTIAL, "aggregates the serial test's weak signal"],
      aval: [BLIND, "not a hash-mapping test"],
      coll: [PARTIAL, "sparse-regime collision counts drift off Poisson"],
    },
  },
  {
    label: "GF(2) linearity (MT, xorshift)",
    href: "classical.html#linearity",
    cells: {
      freq: [BLIND, "MT passes every frequency test ever devised"],
      serial: [BLIND, "equidistributed to 623 dimensions — by design"],
      runs: [BLIND, "no local signature"],
      dft: [BLIND, "period 2¹⁹⁹³⁷−1 shows no spectrum peak"],
      bday: [BLIND, "no integer-lattice structure"],
      rank: [STRONG, "bit matrices from linear streams are rank-deficient — the famous BigCrush failure"],
      twolevel: [PARTIAL, "only by aggregating rank/lincomp themselves"],
      aval: [BLIND, "not a mapping test"],
      coll: [BLIND, "collision behaviour is unremarkable"],
    },
  },
  {
    label: "Stuck / short-period low bits",
    href: "diehard.html#viz-birthday",
    cells: {
      freq: [BLIND, "high bits keep global counts balanced"],
      serial: [PARTIAL, "visible only at fine-grained resolutions"],
      runs: [BLIND, "dominated by healthy high bits"],
      dft: [PARTIAL, "low-bit periodicity can surface as spectrum lines"],
      bday: [STRONG, "grid-restricted outputs multiply duplicate spacings (the demo above)"],
      rank: [PARTIAL, "if the folded low-bit stream is tested — PractRand's trick"],
      twolevel: [PARTIAL, "amplifies whatever first level notices"],
      aval: [BLIND, "not a mapping test"],
      coll: [PARTIAL, "bucket counts skew when buckets use low bits"],
    },
  },
  {
    label: "Over-regularity (too uniform)",
    href: "foundations.html#twolevel",
    cells: {
      freq: [BLIND, "a suspiciously perfect count still passes"],
      serial: [BLIND, "same one-sided blindness"],
      runs: [BLIND, "same"],
      dft: [PARTIAL, "extreme regularity can produce spectral structure"],
      bday: [PARTIAL, "too-few duplicate spacings is the other tail"],
      rank: [BLIND, "rank saturates either way"],
      twolevel: [STRONG, "p-values bunched at ½ fail uniformity loudly"],
      aval: [BLIND, "—"],
      coll: [STRONG, "too few collisions is a caught failure (see the collision demo)"],
    },
  },
  {
    label: "Poor avalanche (weak hash mixing)",
    href: "hashing.html#avalanche",
    cells: {
      freq: [PARTIAL, "counter-mode streams from weak mixers drift off balance"],
      serial: [PARTIAL, "structured inputs leak into tuple counts"],
      runs: [PARTIAL, "same, weakly"],
      dft: [PARTIAL, "counter structure can alias into periodicity"],
      bday: [PARTIAL, "via hash-as-PRNG streams"],
      rank: [BLIND, "unless the mixer is GF(2)-linear (xor-shift only: then strong)"],
      twolevel: [PARTIAL, "aggregates the stream tests"],
      aval: [STRONG, "flip-probability matrix measures mixing directly"],
      coll: [STRONG, "structured keysets collide far off birthday expectation"],
    },
  },
];

const GLYPH = ["·", "◐", "●"];
const LABEL = ["blind", "partial", "catches it"];

export default function init(figure) {
  const plot = figure.querySelector(".plot");
  plot.style.overflowX = "auto";
  const readout = document.createElement("output");
  readout.textContent = "hover a cell for the reason; headers link to the page that makes the case";
  figure.querySelector(".controls").appendChild(readout);

  const table = document.createElement("table");
  table.className = "defectmap";
  table.innerHTML = `
    <thead><tr><th>Defect ↓ / test →</th>${TESTS.map((t) =>
      `<th><a href="${t.href}">${t.label}</a></th>`).join("")}</tr></thead>
    <tbody>${DEFECTS.map((d, di) =>
      `<tr><th><a href="${d.href}">${d.label}</a></th>${TESTS.map((t) => {
        const [rating] = d.cells[t.key];
        return `<td class="dm-${rating}" tabindex="0" data-d="${di}" data-t="${t.key}">
          ${GLYPH[rating]}</td>`;
      }).join("")}</tr>`).join("")}
    </tbody>`;
  plot.appendChild(table);

  const explain = (td) => {
    const d = DEFECTS[parseInt(td.dataset.d, 10)];
    const [rating, reason] = d.cells[td.dataset.t];
    const t = TESTS.find((x) => x.key === td.dataset.t);
    readout.textContent =
      `${t.label} vs ${d.label.toLowerCase()} — ${LABEL[rating]}: ${reason}`;
  };
  table.addEventListener("pointerover", (e) => {
    const td = e.target.closest("td[data-d]");
    if (td) explain(td);
  });
  table.addEventListener("focusin", (e) => {
    const td = e.target.closest("td[data-d]");
    if (td) explain(td);
  });
}
