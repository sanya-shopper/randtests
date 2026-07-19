# randtests — statistical tests for PRNGs and hash functions, interactively

A static site walking through the statistical tests applied to pseudorandom
number generators and cryptographic hash functions: the theory behind them
(hypothesis testing, chi-square, Kolmogorov–Smirnov, two-level testing), the
major suites (Diehard, Dieharder, NIST SP 800-22, TestU01, PractRand, ENT,
and others), hash-specific criteria (avalanche/SAC, BIC, SMHasher), and a
full bibliography. Every figure is computed live in the browser by small,
dependency-free ES modules with deterministic seeds — no build step, no
frameworks, no network resources.

Sibling project of **probsim**
([repo](https://github.com/sanya-shopper/distribs) ·
[site](https://sanya-shopper.github.io/distribs/)) and laid out by its
conventions: the published site lives in `docs/`, sources and documentation
cross-reference each other section by section, open-access references are
fetched into `refs/` by script, and a pre-commit hook keeps the two sides
honest.

Live site: <https://sanya-shopper.github.io/randtests/>

## Layout

| Path | Contents | Documented in |
|---|---|---|
| `docs/index.html` | Overview, how to read the site, sixty-year timeline | — |
| `docs/foundations.html` | Hypothesis-testing framework, chi-square, KS, two-level testing | README § Source map |
| `docs/classical.html` | Knuth's empirical catalog, monkey tests, spectral test, RANDU | site § Classical tests |
| `docs/diehard.html` | Marsaglia's battery: history, all tests, assessment | site § Diehard |
| `docs/dieharder.html` | Brown's open-source successor; p-value-of-p-values | site § Dieharder |
| `docs/nist-sts.html` | The 15 NIST tests, two-level evaluation, criticisms | site § NIST STS |
| `docs/testu01.html` | SmallCrush/Crush/BigCrush; what BigCrush found | site § TestU01 |
| `docs/practrand.html` | Unbounded-stream testing; verdict grades | site § PractRand |
| `docs/ent.html` | Walker's five statistics; why ENT is a smoke test | site § ENT |
| `docs/other-suites.html` | gjrand, RaBiGeTe, SPRNG, SP 800-90B, AIS-31 | site § Others |
| `docs/hashing.html` | Avalanche/SAC, BIC, collisions, SMHasher, statistics ≠ security | site § Hash functions |
| `docs/bibliography.html` | All cited sources with links and stable anchor ids | every page |
| `docs/assets/style.css` | All styling; light/dark palettes as CSS custom properties | README § Conventions |
| `docs/assets/js/stats.js` | lnGamma, incomplete gamma, chi-square test, ENT statistics | foundations.html, ent.html |
| `docs/assets/js/prng.js` | Seeded generators: RANDU, mulberry32, biased bits, stuck-bits LCG | classical.html, diehard.html |
| `docs/assets/js/viz/common.js` | Theme reading, HiDPI canvas mounting, axis chrome | README § Conventions |
| `docs/assets/js/viz/pvalues.js` | p-value histogram under adjustable coin bias | foundations.html |
| `docs/assets/js/viz/randu3d.js` | Rotatable 3-D scatter of RANDU triples — the 15 planes | classical.html |
| `docs/assets/js/viz/birthday.js` | Birthday-spacings test, live, good vs defective LCG | diehard.html |
| `docs/assets/js/viz/walk.js` | Random-walk excursions and the arcsine law | nist-sts.html |
| `docs/assets/js/viz/batteries.js` | Log-scale comparison of suite data appetites | testu01.html |
| `docs/assets/js/viz/entlive.js` | ENT's five statistics computed in-browser | ent.html |
| `docs/assets/js/viz/avalanche.js` | Avalanche matrices, selectable mixer library | hashing.html |
| `docs/assets/js/viz/collisions.js` | Birthday-bound explorer: expected vs observed collisions | hashing.html |
| `docs/assets/js/viz/twolevel.js` | Dieharder-style second-level KS verdicts on streamed p-values | dieharder.html |
| `docs/assets/js/viz/streamfail.js` | PractRand-style doubling checkpoints: bits until failure | practrand.html |
| `docs/assets/js/viz/defectmap.js` | Defect × test coverage map (accessible HTML table) | index.html |
| `tests/stats.test.mjs` | Unit tests for stats.js and prng.js against closed forms | README § Testing |
| `tests/check-site.mjs` | Structural tests: links, anchors, citations, README↔source sync | README § Testing |
| `scripts/fetch_refs.sh` | Downloads open-access reference PDFs into `refs/` | refs/README.md |
| `scripts/pre-commit` | Git hook: refuse commits that break the sync checks | Makefile § install-hooks |
| `refs/` | Local copies of open-access reference PDFs (`make fetch-refs`) | refs/README.md |

Each JS module's header comment names the page and section it serves, and
each page's footer names the modules that draw its figures, so you can read
the two side by side. `tests/check-site.mjs` enforces the mapping.

## Test, preview, publish (Ubuntu)

```sh
make test          # unit + structural tests (Node ≥ 18)
make serve         # local preview at http://localhost:8000/
make fetch-refs    # download open-access reference PDFs into refs/
make check-sync    # alias for `make test` — the sync gate
make install-hooks # install the pre-commit hook (once per clone)
make deploy        # push docs/ to the gh-pages branch (see below)
```

GitHub Pages currently serves the `gh-pages` branch, which mirrors `docs/`;
`make deploy` refreshes it after changes to `docs/` are committed on `main`.
Alternatively set *Settings → Pages → Deploy from a branch → `main` /
`docs`* (the probsim configuration) and drop the deploy step entirely —
`docs/.nojekyll` is already in place.

## Conventions

- **Citations.** In-text citations are `<a class="cite"
  href="bibliography.html#key">[Author Year]</a>`; the key is the entry's
  `id` in `docs/bibliography.html`. Open-access entries have a local-PDF
  counterpart mapped in `refs/README.md`.
- **Figures.** Each interactive figure is a `<figure class="viz"
  id="viz-name">` with `.controls` and `.plot` children; a module in
  `docs/assets/js/viz/` exports `default init(figure)` and is imported by a
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
`docs/bibliography.html`) rather than this site where possible. Corrections
welcome by issue or PR — especially on bibliographic details, which follow
the sources listed in `docs/bibliography.html § A note on verification`.
