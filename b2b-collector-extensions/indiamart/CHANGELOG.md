# 1.2.2 — Complete-card extraction and honest coverage

- Replaced the strict Export `/company/<id>` dependency with guarded support for alternate IndiaMART company/seller URLs, company-name nodes and company data attributes.
- Widened card discovery to the complete single-supplier result container so the primary product above a nested company block is retained.
- Added an explicit `Primary product` flag and kept primary products first after company merges.
- Stopped interpreting `Verified Exporter` badges as `Business Type: Exporter`; business class now uses only explicit business-type evidence.
- Added detected/parsed/unparsed card diagnostics and preparation result-card counts to `SearchSummary` and `Coverage`.
- Made `Coverage complete` false for unparsed cards, incomplete dynamic loading, time/click limits, stalled Show More, exact-count conflicts and legacy pages without extraction-quality evidence.
- Added a 50-company IV Cannula regression fixture covering the 15 previously missed suppliers and all seven Manufacturer labels.

# 1.2.1 — Export-only keyword workflow

- Removed the Directory source option and its host permission from the installable extension.
- Removed Product definition, Include terms, Review terms, and the now-unnecessary Save settings button.
- Made the keyword list the only product input and forced all new runs to IndiaMART Export.
- Simplified the Project sheet in Excel to project name, Export source, keywords, creation time, and warning.

# 1.2.0 — Simplified workflow and visible Show More audit

- Removed the URL queue and offline HTML import section from the dashboard.
- Reduced the main workflow to full keyword extraction or full extraction of the selected tab.
- Kept automatic scrolling and Show More enabled by default, raised the safety cap to 20 clicks, and surfaced total/per-search click counts in the dashboard audit.
- Made Export the default source for new projects and explained Directory as an optional India-focused source that may redirect to Export.
- Moved page/delay controls, keyword assessment, company samples, and JSON backup into compact optional sections.
- Reduced the visible audit to unique companies, completed searches, Show More clicks, and coverage status.

# 1.1.1 — Dynamic loader freeze hotfix

- Added a hard 45-second preparation deadline and a 10-click load-more cap.
- Changed growth detection to supplier/product counts; ad, link and page-height churn no longer keeps the loader alive.
- Preserved and extracted partial results when a time/click limit is reached.
- Added an immediate progress message before page preparation starts.
- Added timeout, click-limit, duration and product-anchor evidence to Coverage.
- Added regression checks proving that generic link/height growth is ignored.

# 1.1.0 — Logged-in Export dynamic results

- Added automatic progressive scrolling and safe clicking of exact `Show/Load/View More Products|Suppliers|Results` controls.
- Added growth/stability checks and a bounded stop condition for dynamic result lists.
- Switched card discovery to company-first extraction and removed the early return that discarded later mixed-markup cards.
- Expanded supported IndiaMART Export product URL formats.
- Captured split-line `Business Type` values exactly as displayed.
- Added preparation evidence to Coverage: load-more clicks, company anchors, rounds and dynamic-end status.
- Added regression fixtures for mixed product-link formats, multiple unique manufacturers and safe load-more recognition.

# 1.0.0 — IndiaMART rewrite

- Replaced Made-in-China URL identity and selectors with IndiaMART Directory/Export support.
- Added multi-keyword execution for `dir.indiamart.com/search.mp?ss=` and `export.indiamart.com/search.php?ss=`.
- Added structural card discovery for resilient supplier extraction.
- Added cross-source company identity aliases and deterministic deduplication.
- Added manufacturer/trader/exporter/service classification without automatic exclusion.
- Added evidence records, verification badges, products and coverage audit.
- Added six-sheet XLSX, UTF-8 CSV and complete JSON backup.
- Added offline HTML import and safe stop on access controls.
- Restricted host permissions to three IndiaMART hosts; no remote code or background process.
- Added Node tests, browser fixtures and Persian review/test report.
