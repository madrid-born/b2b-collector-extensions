# B2B Supplier Collector Extensions

Three independent Chrome Manifest V3 extensions for collecting supplier results and exporting evidence for review. Each extension has an English interface and runs from its own directory.

| Extension | Version | Load unpacked folder | Export |
| --- | --- | --- | --- |
| [IndiaMART Supplier Research Suite](indiamart/) | 1.2.2 | `indiamart/` | Excel, company CSV, JSON backup |
| [CAPA Supplier Collector for Made-in-China](made-in-china/) | 0.4.1 | `made-in-china/` | Excel, JSON backup |
| [CAPA TradeIndia Raw Collector](tradeindia/) | 2.0.1 | `tradeindia/` | Excel, JSON backup |

## Install in Chrome

1. Extract the source ZIP or clone the repository.
2. Open `chrome://extensions/` and turn on **Developer mode**.
3. Click **Load unpacked** and select one of the folders in the table. Repeat for each extension you want to use.
4. Open the corresponding marketplace search page, then click the extension icon.

The extensions require no build step, API key or npm packages to run. Collected records and settings are stored locally. Site content and user-entered values are kept in their original language so the exported evidence can be compared with its source. Site labels, badges and filters are recorded as observed. Verify manufacturer status and certificates separately.

## Upload to GitHub

Extract the ZIP. Use the folder containing this README as the repository root. Create an empty GitHub repository, then run these commands from that folder. Replace `YOUR-ACCOUNT` and `YOUR-REPOSITORY` with your repository details.

```sh
git init -b main
git add .
git commit -m "Add English B2B supplier collector extensions"
git remote add origin https://github.com/YOUR-ACCOUNT/YOUR-REPOSITORY.git
git push -u origin main
```

To use GitHub's web uploader, upload the contents of this folder with the three extension directories intact.

## Development checks

Use Node.js 22 or later. Run each command from the repository root.

```sh
npm --prefix indiamart test
npm --prefix made-in-china ci
npm --prefix made-in-china test
npm --prefix tradeindia test
```

The individual READMEs describe optional regressions that use additional saved pages or project backups. DOM and API simulations exercise the checked-in fixtures and collector logic. Live marketplace layouts, sign-in state and pagination require separate testing.
