# TradeIndia Validation History

Historical report for version 2.0.1, dated November 5, 2026.

The raw collection workflow uses the active keyword to identify the search and record its source. It keeps all observed business roles and product titles. Profile IDs provide the company merge key. Product-specific acceptance rules were retired in this version.

## Earlier regression results

- The first supplied HTML snapshot contained 31 product cards. The seventh page contained 11 product cards and 20 company-only cards. All were retained, including suppliers, distributors and unrelated products.
- Substituting Xanthan Gum, Sodium Carboxymethyl Cellulose, CMC, Gelatin and a Unicode keyword into the same markup retained every card. A page keyword that differed from the active project keyword still raised an error.
- Scroll simulation covered late growth, stabilization and the timeout when a page continued to grow.
- The previous backup retained 319 records: 221 products and 98 company-only cards. Companies contained 299 unique profile IDs and one explicitly flagged row with a missing profile ID.
- A product observed under two keywords kept both observations and both business roles. Companies sharing a name and different profile IDs remained separate. Migration kept previously excluded products in raw exports.
- Replaying the saved 11-page run stopped on page 9 after two pages containing only repeat ads or company-only cards.

## Version 2.0.1 follow-up checks

- Detected Manufacturer filter changes in either direction before saving the affected page and removed a stale `manufacturer=true` parameter when the visible filter was off.
- Rejected a page that changed during loading even when the destination had the same keyword.
- Logged failures in Run Log and preserved successful pages in Page Audit.
- Stopped an in-progress first-page scroll without saving a partial capture. A reopened popup could show the saved run status while waiting for the current response.
- Kept distinct observations of the same URL under different filter states without duplicating the product. The Excel export contained six sheets, including Run Log and filter evidence columns.

## Run the checks

Run `npm test` to exercise the mocked background service worker, including filter drift, stop during scroll preparation, keyword changes and backup migration. The replay and saved-page checks below need the original inputs, which were absent from the archive. For DOM checks, install jsdom locally with `npm install --no-save --package-lock=false jsdom` from this folder.

```sh
node tests/fixtures.cjs /path/to/saved-html-folder
node tests/raw.cjs /path/to/review_current.json
node tests/background.cjs /path/to/IV_Cannula.json
node tests/export.cjs /path/to/review_current.json
```

The review JSON is a normalized snapshot of an earlier project export. The recorded results use saved pages and simulated browser APIs, so behavior on a live marketplace can differ.
