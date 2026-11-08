# IndiaMART Supplier Research Suite

A Chrome extension for collecting supplier cards from `export.indiamart.com`. It merges companies across searches and preserves individual observations for review.

## Install and run

1. In `chrome://extensions/`, enable **Developer mode** and use **Load unpacked** to select this folder.
2. Open an IndiaMART Export search page. Click the extension icon and select **Open full dashboard**.
3. Create a project, click **Refresh tabs** and select the source tab.
4. Enter one keyword or product synonym per line and click **Run all keywords**. Use **Collect from current search** to begin at the currently open results page.
5. Check the company counts and coverage report, then export the Excel workbook or company CSV.

The extension scrolls the page and can click matching **Show More Products**, **Suppliers** or **Results** controls automatically. Page preparation is capped at 60 seconds and 20 clicks. The dashboard and Coverage worksheet record the click count. Contact and quote controls are excluded. Collection stops on access checks or CAPTCHA.

## Data and exports

When the cards display them, the extension captures company names, profile IDs and URLs, product titles, URLs and prices, explicit business types, marketplace badges, export history, destinations and review counts. The primary product is marked separately. A **Verified Exporter** badge and the explicit **Business Type** field are separate evidence.

The Excel workbook has six worksheets: `Project`, `SearchSummary`, `Companies`, `Products`, `Evidence` and `Coverage`. Company CSV uses UTF-8 with a BOM. Use JSON backup and restore to transfer projects. Back up existing data and reload the extension from its existing folder when updating an installed copy.

Coverage requires evidence that the search reached its end, recognized cards were parsed, and saved records reconcile with extraction and any exact site count. Legacy captures lacking quality evidence require a rerun. Limits and incomplete preparation are recorded in Coverage.

## Development

Run `npm test` in this folder. See the [validation history](REVIEW_AND_TEST_REPORT.md) for the earlier regression results and the [changelog](CHANGELOG.md) for version history.
