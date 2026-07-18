#!/bin/sh
# fetch_refs.sh — download local PDF copies of the open-access references
# cited in docs/bibliography.html into refs/.
#
# Run from the repository root:   sh scripts/fetch_refs.sh   (or: make fetch-refs)
#
# Only references with a legitimately free PDF are fetched; paywalled items
# (Knuth's TAOCP, the TestU01 TOMS paper, Webster & Tavares at Springer,
# and others) are cited by DOI in the bibliography instead — see
# refs/README.md for the full map.
#
# Note: the cloud sandbox this project was authored in blocks arbitrary
# outbound downloads, which is why the PDFs are fetched by script rather
# than committed. On an ordinary Ubuntu machine this just works.

set -eu
cd "$(dirname "$0")/.."
mkdir -p refs

fetch() {
    out="refs/$1"
    url="$2"
    if [ -s "$out" ]; then
        echo "have    $out"
        return
    fi
    echo "fetch   $out"
    curl -fsSL --retry 2 -o "$out" "$url" || echo "FAILED  $out  ($url)"
}

# NIST publications — all open access at nvlpubs / tsapps.
fetch nist-sp800-22r1a.pdf \
    "https://nvlpubs.nist.gov/nistpubs/legacy/sp/nistspecialpublication800-22r1a.pdf"
fetch nist-sp800-90b.pdf \
    "https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-90B.pdf"
fetch nistir-7896-sha3-round3.pdf \
    "https://nvlpubs.nist.gov/nistpubs/ir/2012/nist.ir.7896.pdf"
fetch nistir-6483-aes-randomness.pdf \
    "https://tsapps.nist.gov/publication/get_pdf.cfm?pub_id=151216"

# IACR ePrint — open access.
fetch kim-2004-nist-corrections.pdf   "https://eprint.iacr.org/2004/018.pdf"
fetch doganaksoy-2010-sha3-stats.pdf  "https://eprint.iacr.org/2010/611.pdf"
fetch siphash-2012.pdf                "https://eprint.iacr.org/2012/351.pdf"
fetch zhu-2016-second-level.pdf       "https://eprint.iacr.org/2016/863.pdf"
fetch kaminsky-2019-mappings.pdf      "https://eprint.iacr.org/2019/078.pdf"
fetch johnston-2022-sp80022-rev.pdf   "https://eprint.iacr.org/2022/540.pdf"

# Journal of Statistical Software — open access.
fetch marsaglia-2003-xorshift.pdf \
    "https://www.jstatsoft.org/index.php/jss/article/view/v008i14/916"

# arXiv — open access.
fetch vigna-2019-mersenne.pdf "https://arxiv.org/pdf/1910.06437"

# JCGT — open access.
fetch jarzynski-olano-2020-gpu-hashes.pdf \
    "https://jcgt.org/published/0009/03/02/paper.pdf"

# Random123 / counter-based generators — author copy.
fetch salmon-2011-random123.pdf \
    "https://www.thesalmons.org/john/random123/papers/random123sc11.pdf"

# Hash-flooding DoS — conference materials.
fetch klink-walde-2011-28c3-slides.pdf \
    "https://fahrplan.events.ccc.de/congress/2011/Fahrplan/attachments/2007_28C3_Effective_DoS_on_web_application_platforms.pdf"
fetch aumasson-2012-siphashdos-slides.pdf \
    "https://www.aumasson.jp/siphash/siphashdos_appsec12_slides.pdf"

# Marsaglia 1968, "Random numbers fall mainly in the planes" — PNAS,
# public access for pre-1997 volumes.
fetch marsaglia-1968-planes.pdf \
    "https://www.pnas.org/doi/pdf/10.1073/pnas.61.1.25"

# BSI AIS-31 v3.0 — open access.
fetch bsi-ais31-v3.pdf \
    "https://www.bsi.bund.de/SharedDocs/Downloads/EN/BSI/Certification/Interpretations/AIS_31_Functionality_classes_for_random_number_generators_e_2024.pdf"

echo "done — see refs/README.md for the reference↔file map"
