# CAPA B2B Supplier Collector

One Chrome extension for IndiaMART Export, Made-in-China, and TradeIndia. It stores data locally and keeps projects and backup formats separate for each marketplace.

## Install and use

1. Open `chrome://extensions/` and turn on **Developer mode**.
2. Select **Load unpacked** and choose the folder containing this README and `manifest.json`. In the source repository, this is the existing `tradeindia` folder.
3. Open a marketplace results page, click the extension icon, and use the **Marketplace** dropdown. The popup detects supported sites on the active tab and remembers your manual selection for other tabs.
4. Click **Open dashboard** for IndiaMART Export or Made-in-China. For TradeIndia, create or select a project and collect from the popup. Chrome asks for TradeIndia site access when you start pagination.

| Marketplace | Features |
| --- | --- |
| [IndiaMART Export](indiamart/README.md) | Keyword queues, supplier and product evidence, Excel and company CSV |
| [Made-in-China](made-in-china/README.md) | Supplier list pagination, URL queues, saved HTML import, and Excel |
| [TradeIndia](TRADEINDIA.md) | Raw card capture, background pagination, and Excel |

## Upgrade from the separate collectors

Before removing any old Chrome installs, stop active runs and export JSON backups of any data you want to keep. IndiaMART and Made-in-China each export a database backup; TradeIndia exports one project per backup.

- If the old TradeIndia extension was loaded from this same folder, reload its existing card in Chrome. Keeping the same folder lets Chrome retain the TradeIndia data already associated with that install.
- To bring in IndiaMART or Made-in-China data, open the matching dashboard and restore that site's JSON backup. If you install from a different folder, restore TradeIndia projects from their backups as well.
- After checking the restored data, remove the old IndiaMART and Made-in-China entries if Chrome still lists them.

## Development

Run the checks from this folder with Node.js 22 or later:

```sh
npm test
npm --prefix indiamart test
npm --prefix made-in-china ci
npm --prefix made-in-china test
```

Chrome needs no build step or npm dependencies to run the extension.
