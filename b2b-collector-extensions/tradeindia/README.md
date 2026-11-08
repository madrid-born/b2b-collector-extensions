# CAPA TradeIndia Raw Collector

A Chrome extension for recording the raw cards shown on TradeIndia's `search.html` results page. It retains all observed business roles, product titles and company-only cards for later screening.

## Install and collect

1. In `chrome://extensions/`, enable **Developer mode** and use **Load unpacked** to select this folder.
2. Search for a product on TradeIndia and open the extension popup.
3. Create a project with the same keyword. Choose **Capture current page** for one page or **Start pagination** to continue through results. Multi-page collection requests site access.
4. To add a keyword, wait for the run to finish, enter the next term under **Active keyword**, select **Set keyword**, then perform the same search on TradeIndia.
5. Select **Export raw Excel** or **JSON backup**.

Leave the optional page limit blank for automatic stopping. Collection scrolls until the page stabilizes and stops after two consecutive pages containing neither an organic product card nor a new advertised product. A missing next link, repeated content, access restrictions, loading failures or changed filters can stop the run earlier. Keep the browser and source tab open. The popup can be closed during pagination.

The marketplace's Manufacturer filter is optional. The collector checks that its state stays the same during a run and records it with each observation. It captures listings as shown and does not verify a company's role or whether an item matches the product scope.

## Data and exports

Company identities are merged by profile ID. Product identities are merged within each company while observed titles, roles, keywords and source URLs are retained. Missing profile IDs are flagged. Company-only cards are retained with empty product fields. Products reflect the observed search cards. They represent only the portion of each catalog shown in the search results.

The Excel workbook has six sheets: `Companies`, `Collected Products`, `Company Only`, `Page Audit`, `Run Log` and `Settings`. Page Audit records successful captures. Run Log also records starts, stops and failures. Historical filter states that were never recorded are labeled `Not logged (legacy)`.

To update an existing install, stop the active run, export a JSON backup, replace the files in the existing installation folder and click **Reload**. Existing `CAPA-TI-1` backups can be restored. Legacy screening decisions remain in backup data for reference, while raw exports include the originally collected records.

## Development

Run `npm test` in this folder. See the [test report](TEST_REPORT.md) for the checks that require original HTML snapshots and backups.
