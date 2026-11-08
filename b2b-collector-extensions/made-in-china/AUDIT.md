# Made-in-China Validation History

## Version 0.4.1

The injected function catches extraction errors inside the source tab and sends the actual error and URL to the dashboard. The injection regression checks that transient errors are retried three times, blocked pages stop after one attempt, and successful results are returned intact. The underlying extraction failure that prompted the reporting change was unresolved in the original audit.

## Version 0.4.0

- Four Manufacturer pages without a certificate had 30, 30, 30 and 23 cards, for 113 unique profiles. One Manufacturer plus ISO 13485 page contained 17 cards and ended on page 1.
- Snapshot checks reconcile names, profile domains, cities, business types and main products against values independently read from each card.
- A simulated browser run merges the four pages with the ISO result into 113 profiles and retains 17 after deleting the no-certificate search.
- Tests cover route changes, unknown card classes, lookalike domains, pages without supplier evidence, inactive filters, empty results, legacy search groups, backup restore and search deletion.
- Earlier CMC regressions used seven saved pages. The three searches contained 138, 94 and 65 unique profiles, with a combined 138 profiles, 15 distinct showrooms, 297 observations and 443 sampled products.
- Browser API calls are mocked. Live collection from the current site is outside the repository tests.

## Run optional regressions

The default `npm test` uses the checked-in snapshots and synthetic controller scenarios. The scripts below are retained for use with the original HTML inputs, which were absent from the archive. Place matching input files in an `upload/` directory under this extension and run the scripts from this extension's directory.

| Script | Input |
| --- | --- |
| `node tests/audit_edges_test.cjs` | Saved directory HTML named `Iv cannula Manufacturers & Suppliers, China iv cannula Manufacturers Price.html` |
| `node tests/directory_test.cjs` | The same saved directory HTML |
| `node tests/fixtures_test.cjs` | Saved HTML files whose names start with `IV Cannula` or `Xanthan` |
| `node tests/dashboard_test.cjs` | Saved file named `IV Cannula Manufacturers, IV Cannula Manufacturers Directory,China IV Cannula Suppliers(1).html` |
| `node tests/cmc_regression.cjs` | Seven saved pages named `1(1).html` through `7(1).html` |
