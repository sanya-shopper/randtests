# randtests — test, serve, and publish the "Testing Randomness" site.
# See README.md for an overview; the site itself lives in docs/ and is
# served by GitHub Pages. Conventions follow the sibling probsim project
# (github.com/sanya-shopper/distribs).

.PHONY: test serve fetch-refs check-sync install-hooks deploy clean

# Unit tests (docs/assets/js/stats.js, prng.js) and structural tests
# (links, anchors, citations, README↔source sync). Requires Node ≥ 18.
test:
	node --test tests/*.mjs

# Local preview — ES modules need http, not file://.
serve:
	cd docs && python3 -m http.server 8000

# Local PDF copies of the open-access bibliography, fetched into
# ../_refs/randtests/ (reference↔file map: bibsrc/README.md).
fetch-refs:
	sh scripts/fetch_refs.sh

# The site's analogue of probsim's paper↔site sync check: the structural
# tests fail if a page, module, or README entry falls out of sync.
check-sync: test

# Git pre-commit hook: refuse commits that break the sync checks.
install-hooks:
	cp scripts/pre-commit .git/hooks/pre-commit
	chmod +x .git/hooks/pre-commit
	@echo "pre-commit hook installed"

# Publish: GitHub Pages serves the gh-pages branch, which mirrors docs/.
# (If you instead set Settings → Pages → main /docs, this target becomes
# unnecessary — then just push main.)
deploy:
	git subtree push --prefix docs origin gh-pages

clean:
	@echo "nothing to clean — the site has no build step"
