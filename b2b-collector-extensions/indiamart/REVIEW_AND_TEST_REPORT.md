# IndiaMART Validation History

Historical report dated November 7, 2026. The checks below describe earlier source releases. Run `npm test` to verify the checks distributed with this repository.

| Release | Scope | Historical findings |
| --- | --- | --- |
| 1.0.0 | Adapted the Made-in-China architecture for IndiaMART Directory and Export. | Model tests covered cross-source merging, stable recapture, reconciliation, project cleanup and backup validation. Export checks covered six XLSX sheets and the ZIP signature. |
| 1.1.0 | Improved dynamic loading and discovery across mixed result markup. | The old extractor found 7 of 40 cards in a signed-in Export sample. A regression fixture covered three suppliers, multiple product URL formats and split-line Business Type evidence. |
| 1.1.1 | Bounded preparation and measured growth by company and product evidence. | Advertising, link and height changes no longer extended preparation. A time or click limit preserved partial captures and made the reason visible in Coverage. |
| 1.2.0 | Simplified the dashboard and surfaced Show More counts. | Six IV Infusion Set searches in a prior export each logged four Show More clicks. Preparation limits became 60 seconds and 20 clicks. |
| 1.2.1 | Narrowed the installable workflow to IndiaMART Export. | Removed the Directory host permission and the dashboard's product definition and keyword-assessment settings. |
| 1.2.2 | Fixed missed suppliers and retained primary products. | The previous export had 35 of 50 suppliers and four of seven Manufacturer labels. The updated 50-card browser fixture captured every supplier and all seven labels. Eight cards with only a Verified Exporter badge kept an empty Business Type. The primary product was flagged on all 50 cards. A separate controlled Show More click loaded a second card. |

The 1.2.2 extractor recognizes alternate IndiaMART company, supplier and seller URLs, profile slugs, company-name nodes and company data attributes. Card detection includes the enclosing single-supplier container so the primary product can be read above an inner company block. Coverage checks parse counts, preparation outcomes, record set reconciliation and any exact reported total.

The original 50-card browser fixture referenced above was absent from the supplied source archive. The historical test used an offline browser fixture. Live end-to-end 1.2.2 collection was outside that test. DOM structure can change, name-based fallback can merge similarly named companies, and marketplace labels need independent verification. Inspect the Evidence worksheet and saved profile URLs when reviewing possible duplicates.
