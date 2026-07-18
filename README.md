# Testing Randomness

A static site walking through the statistical tests applied to pseudorandom
number generators and cryptographic hash functions: the theory behind them
(hypothesis testing, chi-square, Kolmogorov–Smirnov, two-level testing), the
major suites (Diehard, Dieharder, NIST SP 800-22, TestU01, PractRand, ENT,
and others), hash-specific criteria (avalanche/SAC, BIC, SMHasher), and a
full bibliography. Every figure is computed live in the browser by small,
dependency-free ES modules with deterministic seeds.

Sibling project of **probsim**; like it, this is a plain static site — no
build step, no framework, no CDN dependencies — served directly by GitHub
Pages.

## Viewing locally

Any static file server works (ES modules require http, not file://):

```sh
python3 -m http.server 8000
# then open http://localhost:8000/
```

## Deploying

Push to GitHub, then Settings → Pages → deploy from branch, root folder.
`.nojekyll` is included so Pages serves files verbatim.

## Testing

```sh
node --test tests/*.mjs
```

- `tests/stats.test.mjs` — unit tests for the statistical machinery
  (`assets/js/stats.js`) against closed forms and standard chi-square
  tables, and for the generators (`assets/js/prng.js`) — including a check
  that RANDU really satisfies the recurrence the site claims it does.
- `tests/check-site.mjs` — structural tests: every internal link and anchor
  resolves, every citation hits a bibliography entry, every viz module is
  used by a page, every page and module is documented here, and every page
  carries the shared nav. **These tests are the enforcement mechanism for
  the docs↔source conventions below** — if you add a page or module and
  forget to wire it in, they fail.

Requires Node ≥ 18 (uses `node:test`).

## Source map

Docs → source: each page lists, in its footer, the modules that draw its
figures. Source → docs: each module's header comment names the page and
section it serves. The full map:

| Page | Content | Figure modules |
|---|---|---|
| `index.html` | Overview, how to read the site, sixty-year timeline | — |
| `foundations.html` | Hypothesis-testing framework, chi-square, KS, two-level testing | `pvalues.js` |
| `classical.html` | Knuth's empirical test catalog, monkey tests, spectral test, RANDU, F2-linearity | `randu3d.js` |
| `diehard.html` | Marsaglia's battery: history, all tests, assessment | `birthday.js` |
| `dieharder.html` | Brown's open-source successor; p-value-of-p-values approach | — |
| `nist-sts.html` | The 15 NIST tests, two-level evaluation, published criticisms | `walk.js` |
| `testu01.html` | SmallCrush/Crush/BigCrush, Rabbit/Alphabit, what BigCrush found | `batteries.js` |
| `practrand.html` | Unbounded-stream testing, core tests, verdict grades | — |
| `ent.html` | Walker's five statistics; why ENT is a smoke test | `entlive.js` |
| `other-suites.html` | gjrand, RaBiGeTe, SPRNG, NIST SP 800-90B health tests, AIS-31 | — |
| `hashing.html` | Avalanche/SAC, BIC, collisions & birthday bound, SMHasher, hash-as-PRNG, statistics ≠ security | `avalanche.js` |
| `bibliography.html` | All cited sources with links | — |

Shared code under `assets/`:

| File | Role |
|---|---|
| `assets/style.css` | All styling, light/dark palettes as CSS custom properties |
| `assets/js/stats.js` | lnGamma, regularized incomplete gamma, chi-square test, ENT statistics |
| `assets/js/prng.js` | Seeded generators: RANDU, mulberry32, biased bits, a stuck-low-bits LCG |
| `assets/js/viz/common.js` | Theme reading, HiDPI canvas mounting, shared axis chrome |
| `assets/js/viz/pvalues.js` | p-value histogram under adjustable coin bias (`foundations.html`) |
| `assets/js/viz/randu3d.js` | Rotatable 3-D scatter of RANDU triples — the 15 planes (`classical.html`) |
| `assets/js/viz/birthday.js` | Birthday-spacings test, live, good vs defective generator (`diehard.html`) |
| `assets/js/viz/walk.js` | Random-walk excursions and the arcsine law (`nist-sts.html`) |
| `assets/js/viz/batteries.js` | Log-scale comparison of suite data appetites (`testu01.html`) |
| `assets/js/viz/entlive.js` | ENT's five statistics computed in-browser (`ent.html`) |
| `assets/js/viz/avalanche.js` | Avalanche matrices of a weak vs strong mixer (`hashing.html`) |

## Conventions

- **Citations.** In-text citations are `<a class="cite"
  href="bibliography.html#key">[Author Year]</a>`; the key is the entry's
  `id` in `bibliography.html`. `tests/check-site.mjs` verifies every key.
- **Figures.** Each interactive figure is a `<figure class="viz"
  id="viz-name">` with `.controls` and `.plot` children; a module in
  `assets/js/viz/` exports `default init(figure)` and is imported by a
  `<script type="module">` at the end of the page. Modules read colors from
  the CSS custom properties (via `viz/common.js § theme`) so light/dark
  stays consistent, and take deterministic seeds so every visitor sees the
  figure the caption describes.
- **Math.** Formulas are plain HTML (`<var>`, `<sub>`, `<sup>`, Unicode) —
  no client-side math renderer, keeping pages self-contained.
- **No dependencies.** No build step, no external scripts or fonts. What is
  in the repo is what is served.

## License / status

Text and code © the author; cite the underlying primary sources (see
`bibliography.html`) rather than this site where possible. Corrections
welcome by issue or PR — especially on bibliographic details, which follow
the sources listed in `bibliography.html § A note on verification`.
