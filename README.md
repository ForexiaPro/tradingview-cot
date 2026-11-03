# COT Positioning: a TradingView indicator

A Pine Script v6 indicator that shows the CFTC's weekly **Commitments of Traders (COT)** report for the chart's currency or gold, in its own pane:

- **net non-commercial** (large speculators) and **net commercial** (hedgers) positions, in contracts;
- optionally, the same **net as a share of open interest**, so years with more or fewer contracts open compare;
- two alerts for when the speculators' net position **crosses zero** (flips net long or net short);
- a table with the latest report (net speculators, change on the week, % of open interest, net commercials), and a warning when the data is more than ten days old.

Markets: EUR, GBP, JPY, CHF, CAD, AUD, NZD, MXN, the US dollar index and gold, picked from the chart (EURUSD, USDJPY, XAUUSD, DXY, 6E1!, GC1!...) or in the settings. On a chart where the dollar comes first (USDJPY, USDCHF, USDCAD, USDMXN), the positions are turned over, so up is long the pair on your chart. Each report appears from its Friday release (15:30 New York), not from the Tuesday it counts, so history never shows a report before it was public.

The figures are the CFTC's positions, as published in [ForexiaPro/cot-data](https://github.com/ForexiaPro/cot-data). For Forexia's COT index and weekly reading, see [forexiapro.com/cot-report](https://forexiapro.com/cot-report/?via=tv-cot).

## Files

| Path | What |
| --- | --- |
| `pine/template.pine` | The indicator's source. Edit this one. |
| `pine/cot-positioning.pine` | The script to paste into TradingView: the template with the data written in. Generated. |
| `scripts/generate.mjs` | Writes it from cot-data's `data/legacy/<ID>.json` (Node 18+, no dependencies). |
| `tradingview/description.txt` | The publication's description, written to TradingView's House Rules. |
| `.github/workflows/generate.yml` | Regenerates and commits the script every Saturday after cot-data's Friday update. |

```sh
node scripts/generate.mjs                          # from github.com/ForexiaPro/cot-data
node scripts/generate.mjs --data ../cot-data/data  # from a local copy
node scripts/generate.mjs --since 2012-01-01       # keep more history (default 2016)
npm test
```

## Why the data is inside the script

Pine reads no files and calls no web address, so the generator writes each market's weekly records into the script as text, parsed once on the first bar (about 200 KB for ten markets since 2016). The cost is a republish to bring in each week's report.

TradingView does carry the CFTC's raw COT figures itself (the `COT:` symbols, and its `LibraryCOT` library), which a script can read with `request.security()` and which update without a republish. This indicator ships cot-data's own figures instead, so every number matches the dataset, release timing included. A live variant on TradingView's feed is possible: the owner decides whether to build it (it would need no weekly republish).

## Publishing (owner)

TradingView has no publishing API. Each update is by hand:

1. Open the Pine editor, paste `pine/cot-positioning.pine`, compile (check that it compiles: it has not been compiled outside TradingView), and add it to a clean chart (EURUSD, weekly) with nothing else on it, symbol, timeframe and the script's name visible in the status line.
2. The first time: **Publish script**, public, open source, category Volume or Statistics; title `COT Positioning: Speculators and Commercials`; description from `tradingview/description.txt`.
3. Each week (or month): **Publish script → Update existing script**, with a release note such as "Data to 2026-10-27".

**House Rules** ([script publishing rules](https://www.tradingview.com/support/solutions/43000590599-script-publishing-rules/), [House Rules](https://www.tradingview.com/house-rules/)), checked on 2026-11-02:

- No links or references to websites, social media or contact details in the description, release notes, title, chart or code, and no promotion: the description and the script name no site (a test checks). The links in this README are for GitHub, not TradingView.
- The description must stand on its own, in English first, and explain what the script does and how: it does.
- Open source, original: the pair-terms flip, the release timing and the zero-cross alerts are this script's own.
- Links to Forexia go in the **profile's signature** (a Premium plan feature, shown under each publication) and the profile's status field: `https://forexiapro.com/cot-report/?via=tv-cot`.

## Licence

The code is MIT. The CFTC's figures are public domain. For Forexia's COT index and weekly reading: [forexiapro.com/cot-report](https://forexiapro.com/cot-report/?via=tv-cot). Not investment advice.

---

Part of the Forexia network: [InterestRateDecision.com](https://interestratedecision.com/?via=tv-cot) · [Forexia Academy](https://forexiapro.com/?via=tv-cot) · [TradingSignalBot](https://tradingsignalbot.com/?via=tv-cot) · [PropSim](https://github.com/PropSim-Enterprise) · [OpenCharts](https://github.com/dylanpersonguy/OpenCharts)
