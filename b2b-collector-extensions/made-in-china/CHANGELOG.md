# 0.4.1
- Catch extractor exceptions inside the injected browser function and transport the actual message and source URL to the dashboard.
- Preserve extraction/merge/export logic. Add a test that executes the injected function instead of returning precomputed data.
- This corrects error reporting, not a confirmed fix for the user's still-unknown page extraction failure.

# 0.4.0
- Accept HTTPS Made-in-China domains independently of URL path; validate supplier content before saving.
- Add live quality-china-supplier layout, structural fallback, content-based search identity and DOM pagination.
- Retain active filters across pagination; validate partial loading, totals and page-size changes.
- Preserve company keys and Excel schema; retain legacy search groups when content identity matches.
- Test 113 suppliers over four real DOM snapshots and 17 ISO suppliers on a single-page snapshot, plus existing regression suites.

# 0.3.1
- Remove Products and Observations worksheets from the Excel export only.
- Retain other worksheets and internal data without changes.
- Add independent test-only dedup reconciliation and negative loss-detection check.
- No changes to extractor, merge model, pagination, settings, UI or OOXML writer.

# 0.3.0
- Distinguish shared-domain company profiles by /showroom/{id}.
- Independent per-project settings and explicit optional assessment; remove medical defaults.
- Recompute new/exclusive counts from company observations.
- Write native numeric and boolean OOXML cells; keep formula-like strings as text.
- Preserve legacy databases but mark their projects unverified/re-extraction required. Do not silently claim to recover collapsed records.
- CMC regression: all 7 supplied HTMLs, 138/94/65 query profiles, union 138, 15 distinct showrooms, 297 observations and 443 sample products.
- Independent lxml reference confirms names, profile URLs, cities and all product-owner-title tuples for these fixtures.

# 0.2.0
- Supplier pagination scoped to result pager, excluding unrelated recommendation carousels.
- Selected certificate names and all selected filter labels captured from saved/live result cards.
- Search coverage complete only with contiguous pages from 1 to observed terminal page.
- Canonical identities ignore tracking and normalize filter token order.
- Idempotent page and observation updates; company union by profile hostname and project.
- Search comparison: unique companies, first-discovery additions, and exclusive companies.
- Project product definition and matching terms exported; no automatic rejection.
- Filter drift, redirect, repeated page and identical successive results stop collection.
- UI controls locked during collection; preferences saved locally.
- Six-sheet Excel, local backup/restore and HTML import retained.

Limitations: no independent manufacturer or certificate verification; no live Chrome or live site end-to-end test in this environment. Multi-account corporate identities are not automatically merged. Multi-certificate OR and keyword union use user-supplied real search URLs.


## 0.3.2
- Added confirmed deletion of one exact query/filter group within the selected project.
- Preserves shared companies and other projects; recalculates existing summaries through the existing report code.
- No changes to extraction, pagination, merge logic, or Excel structure.


## 0.3.3
- Supports directory `/manufacturers/` URLs and underscore pagination numbers.
- Adds label-based company field extraction alongside existing table extraction.
- Preserves filtered company-search routes when directory pager links omit filters; rejects unexpected keyword changes.
- Normalizes dedicated company profile links from directory virtual-tour destinations.
- Stops on unreadable supplier cards rather than silently skipping them.
- Existing merge, deduplication, search deletion, project settings, Excel sheet construction and schema remain unchanged.
- Verified real saved first directory page and existing IV/CMC/Xanthan fixtures. Later directory page boundary tests are synthetic; live browser pagination requires user validation.


## 0.3.4
- Directory URL query fallback when word input is absent.
- Read selected Business Type from DOM for manufacturer flag, including bare directory URLs.
- No changes to merging, identity keys, deletion or Excel export.


## 0.3.5
- Added boundary and controller audit tests; verified before/after failures for changed-page membership, stable discovery counts, atomic row validation, unsafe Next, source/pager mismatch, missing company links, non-adjacent repeated page content, query switches and malformed restore files.
- Refreshed page membership replaces that page's old membership, preserving companies still present in other sources/projects.
- Preserve the first observation timestamp when a page is recaptured so discovery counts stay stable.
- Validate all rows before merging a page and validate restore candidates before replacing stored data.
- Recognize canonical continuation of a legacy companysearch.do first page, retaining its original source URL.
- Reject contradictory visible business/certificate filters, invalid page numbers, and protect completeness checks against unbounded page-number allocations.
- Excel writer, sheet/column construction, layout, profile deduplication key and normal extraction values unchanged.
