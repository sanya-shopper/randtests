# refs/ — local copies of the bibliography

This directory holds local PDF copies of the open-access references cited in
`docs/bibliography.html`. Populate it with:

```sh
sh scripts/fetch_refs.sh     # or: make fetch-refs
```

(The PDFs are not committed: the cloud sandbox in which this repository was
authored blocks arbitrary outbound downloads, and re-fetching from the
canonical sources keeps the repo small and the provenance clean. The layout
and rationale mirror the sibling probsim project.)

## What lands here, and what cannot

| File | Reference (bibliography id) | Status |
|---|---|---|
| `nist-sp800-22r1a.pdf` | NIST SP 800-22 Rev 1a (`nist2010`) | open access, NIST |
| `nist-sp800-90b.pdf` | NIST SP 800-90B (`nist2018`) | open access, NIST |
| `nistir-7896-sha3-round3.pdf` | NIST IR 7896 (`nistir7896`) | open access, NIST |
| `nistir-6483-aes-randomness.pdf` | Soto & Bassham 2000 (`soto2000`) | open access, NIST |
| `kim-2004-nist-corrections.pdf` | Kim et al. 2004 (`kim2004`) | open access, IACR ePrint |
| `doganaksoy-2010-sha3-stats.pdf` | Doğanaksoy et al. 2010 (`doganaksoy2010`) | open access, IACR ePrint |
| `siphash-2012.pdf` | Aumasson & Bernstein 2012 (`aumasson2012`) | open access, IACR ePrint |
| `zhu-2016-second-level.pdf` | Zhu et al. 2016 (`zhu2016`) | open access, IACR ePrint |
| `kaminsky-2019-mappings.pdf` | Kaminsky 2019 (`kaminsky2019`) | open access, IACR ePrint |
| `johnston-2022-sp80022-rev.pdf` | NIST review 2022 (`nist-review2022`) | open access, IACR ePrint |
| `marsaglia-2003-xorshift.pdf` | Marsaglia 2003 (`marsaglia2003`) | open access, JSS |
| `vigna-2019-mersenne.pdf` | Vigna 2019 (`vigna2019`) | open access, arXiv |
| `jarzynski-olano-2020-gpu-hashes.pdf` | Jarzynski & Olano 2020 (`jarzynski2020`) | open access, JCGT |
| `salmon-2011-random123.pdf` | Salmon et al. 2011 (`salmon2011`) | author copy, thesalmons.org |
| `klink-walde-2011-28c3-slides.pdf` | Klink & Wälde 2011 (`klink2011`) | conference slides, CCC |
| `aumasson-2012-siphashdos-slides.pdf` | Aumasson & Bernstein 2012 (`aumasson2012`) | attack slides, aumasson.jp |
| `marsaglia-1968-planes.pdf` | Marsaglia 1968 (`marsaglia1968`) | public access, PNAS |
| `bsi-ais31-v3.pdf` | BSI AIS-31 v3.0 (`ais312024`) | open access, BSI |
| — | Knuth 1997, TAOCP vol. 2 (`knuth1997`) | book; cited by edition |
| — | L'Ecuyer & Simard 2007 (`lecuyer2007`) | paywalled (ACM TOMS); cited by DOI, software free at simul.iro.umontreal.ca |
| — | Webster & Tavares 1985 (`webster1985`) | paywalled (Springer); cited by DOI |
| — | Pearson 1900 (`pearson1900`) | paywalled (Phil. Mag.); cited by DOI |
| — | Feistel 1973 (`feistel1973`) | paywalled (Sci. Am.); cited by DOI |
| — | Feller 1968 (`feller1968`) | book; cited by edition |
| — | Marsaglia 1995 Diehard CDROM (`marsaglia1995`) | defunct site; cited via web.archive.org |
| — | Marsaglia & Zaman 1993 (`marsaglia1993`) | paywalled (Elsevier); cited by DOI |
| — | Matsumoto & Nishimura 1998 (`matsumoto1998`) | paywalled (ACM); cited by DOI |
| — | Panneton & L'Ecuyer 2005 (`panneton2005`) | paywalled (ACM); cited by DOI |
| — | Pareschi et al. 2012 (`pareschi2012`) | paywalled (IEEE); cited by DOI |
| — | Good 1953 (`good1953`) | paywalled (CUP); cited by volume/page |
| — | remaining suite/software entries | websites; cited by URL in the bibliography |
