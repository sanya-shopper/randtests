/* check-site.mjs — structural checks for the site itself.
 *
 * Run with:  node --test tests/*.mjs
 * Documented in README.md § Testing.
 *
 * What it verifies (kept in sync with README.md § Source map — if you add
 * a page or a viz module, these tests are what remind you to wire it in):
 *  1. Every internal link and script/stylesheet reference in every HTML
 *     page resolves to a file that exists.
 *  2. Every fragment link (page.html#anchor) resolves to an id in the
 *     target page.
 *  3. Every citation link points into bibliography.html and hits an entry.
 *  4. Every viz module in assets/js/viz/ (except common.js) is used by at
 *     least one page, and every page's <script type="module"> imports a
 *     module that exists.
 *  5. Every HTML page and every JS module is mentioned in README.md, and
 *     every page carries the shared nav with itself marked current.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), "..");
const SITE = join(ROOT, "docs"); // the GitHub Pages folder (probsim layout)

const htmlFiles = readdirSync(SITE).filter((f) => f.endsWith(".html"));
const vizDir = join(SITE, "assets", "js", "viz");
const vizModules = readdirSync(vizDir).filter((f) => f.endsWith(".js"));
const pages = Object.fromEntries(
  htmlFiles.map((f) => [f, readFileSync(join(SITE, f), "utf8")]),
);
const readme = readFileSync(join(ROOT, "README.md"), "utf8");

const idsIn = (html) =>
  new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));

test("internal links, stylesheets and module imports resolve", () => {
  for (const [file, html] of Object.entries(pages)) {
    const refs = [
      ...[...html.matchAll(/\bhref="([^"]+)"/g)].map((m) => m[1]),
      ...[...html.matchAll(/\bsrc="([^"]+)"/g)].map((m) => m[1]),
      ...[...html.matchAll(/\bfrom\s+"(\.[^"]+)"/g)].map((m) => m[1]),
    ];
    for (const ref of refs) {
      if (/^(https?:)?\/\//.test(ref) || ref.startsWith("mailto:")) continue;
      const [path] = ref.split("#");
      if (path === "") continue; // same-page fragment
      assert.ok(
        existsSync(join(SITE, path)),
        `${file}: broken reference ${ref}`,
      );
    }
  }
});

test("fragment links hit an existing id in the target page", () => {
  for (const [file, html] of Object.entries(pages)) {
    for (const m of html.matchAll(/\bhref="([^":]+\.html)#([^"]+)"/g)) {
      const [, target, anchor] = m;
      assert.ok(pages[target], `${file}: link to missing page ${target}`);
      assert.ok(
        idsIn(pages[target]).has(anchor),
        `${file}: broken anchor ${target}#${anchor}`,
      );
    }
    for (const m of html.matchAll(/\bhref="#([^"]+)"/g)) {
      assert.ok(
        idsIn(html).has(m[1]),
        `${file}: broken same-page anchor #${m[1]}`,
      );
    }
  }
});

test("every citation resolves to a bibliography entry", () => {
  const bibIds = idsIn(pages["bibliography.html"]);
  for (const [file, html] of Object.entries(pages)) {
    for (const m of html.matchAll(/class="cite" href="([^"]+)"/g)) {
      const href = m[1];
      const [path, anchor] = href.split("#");
      const okPath = path === "bibliography.html" || (file === "bibliography.html" && path === "");
      assert.ok(okPath, `${file}: citation must point into bibliography.html (${href})`);
      assert.ok(anchor && bibIds.has(anchor), `${file}: unknown citation key ${href}`);
    }
  }
});

test("every viz module is used by at least one page", () => {
  const allHtml = Object.values(pages).join("\n");
  for (const mod of vizModules) {
    if (mod === "common.js") continue;
    assert.ok(
      allHtml.includes(`assets/js/viz/${mod}`),
      `viz module ${mod} is not referenced by any page`,
    );
  }
});

test("README documents every page and module (docs↔source sync)", () => {
  for (const f of htmlFiles) {
    assert.ok(readme.includes(f), `README.md does not mention ${f}`);
  }
  for (const mod of vizModules) {
    assert.ok(readme.includes(mod), `README.md does not mention viz/${mod}`);
  }
  for (const mod of ["prng.js", "stats.js"]) {
    assert.ok(readme.includes(mod), `README.md does not mention ${mod}`);
  }
});

test("every page carries the nav and marks itself current", () => {
  for (const [file, html] of Object.entries(pages)) {
    assert.ok(html.includes('nav class="site"'), `${file}: missing site nav`);
    assert.ok(
      html.includes(`href="${file}" aria-current="page"`),
      `${file}: nav does not mark this page as current`,
    );
  }
});
