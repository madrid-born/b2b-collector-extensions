# CAPA Supplier Collector for Made-in-China

Collect visible supplier cards from Made-in-China, merge overlapping searches and export an audited supplier workbook. The extension works with live supplier-list tabs and saved HTML.

## Install and collect

1. In `chrome://extensions/`, enable **Developer mode** and use **Load unpacked** to select this folder.
2. Open a Made-in-China supplier list and select the desired marketplace filters. Open the collector dashboard from the extension icon.
3. Click **Refresh tabs**, choose the source tab, and enter a project name. Product definition, certificate note and keyword assessment are optional.
4. Click **Collect current page** for a trial. To follow pagination, start from page 1 and click **Start from current page and follow pagination**. The default delay is six seconds and the page limit is 500.
5. Check **Search Coverage and Comparison**, then click **Download Excel** or **Download JSON backup**.

To combine keywords or certificate searches, paste one original supplier-list URL per line and keep the same project name. The queue builds a union of matching companies. The page limit applies to each URL. Keep the dashboard and source tab open during a run. To resume, start from the next URL recorded in Coverage. Rereading a page refreshes that page's membership and evidence.

To import saved pages, select the HTML files. When a file lacks its original URL, provide it manually. Imports parse content without running the saved page's scripts or following pagination.

## Evidence and coverage

- The certificate note is optional. Actual marketplace filters and their codes are recorded separately. Certificate validity and manufacturer status need separate verification.
- Deduplication uses the company profile hostname and, on shared domains, the showroom identity. The project remains the boundary for merging.
- Keyword assessment is off by default. When enabled, separate terms with `|`. Assessment adds an initial label and retains every collected supplier.
- Full coverage requires contiguous pages from page 1 through an observed terminal page. Filter changes, repeated pages, redirects, access checks and loading errors can stop collection.
- **Delete this search** removes only the selected query and filter group. Companies observed in other searches remain.
- Excel includes `Project`, `SearchSummary`, `Companies` and `Coverage`. JSON backups retain the internal records, including product observations. Restoring a backup replaces local data after confirmation.

To update an existing install, stop active runs, close old dashboard tabs, export a JSON backup, replace the files in the existing installation directory and click **Reload** in `chrome://extensions/`. Legacy projects that lack current coverage evidence may need to be collected again in a new project.

## Development

Run `npm ci` and `npm test` in this folder. The default suite uses bundled DOM snapshots and simulated Chrome APIs. Optional regressions that need additional saved pages are listed in the [audit report](AUDIT.md). See [CHANGELOG.md](CHANGELOG.md) for version history.
