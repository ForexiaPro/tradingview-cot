#!/usr/bin/env node
// Writes pine/cot-positioning.pine from pine/template.pine and the cot-data dataset.
// Node 18+, no dependencies. Pine cannot read files or the web, so the weekly
// figures go into the script as text, parsed once on the first bar.
//
//   node scripts/generate.mjs                       read github.com/ForexiaPro/cot-data
//   node scripts/generate.mjs --data ../cot-data/data  read a local copy
//   node scripts/generate.mjs --since 2016-01-01    the first report kept (default)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
export const RAW = 'https://raw.githubusercontent.com/ForexiaPro/cot-data/main/data';
export const MARKETS = ['EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD', 'MXN', 'USD', 'XAU'];
/** Pine string literals stay well under the language's limits. */
export const CHUNK = 4000;

/** The Friday 15:30 New York a Tuesday's report is normally released, in ms. */
export function releaseOf(tuesday) {
  const friday = new Date(Date.parse(`${tuesday}T12:00:00Z`) + 3 * 86400e3).toISOString().slice(0, 10);
  const probe = new Date(`${friday}T20:30:00Z`);
  const hour = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', hourCycle: 'h23' }).format(probe));
  return Date.parse(`${friday}T${hour === 16 ? '19' : '20'}:30:00Z`);
}

const num = (x) => (x == null ? '' : String(x));

/** A cot-data legacy file -> records "releaseMinutes,specNet,commNet,specPctOi,commPctOi" (net as % of open interest). */
export function recordsOf(file, since) {
  const c = Object.fromEntries(file.columns.map((name, i) => [name, i]));
  return file.rows
    .filter((r) => r[c.date] >= since)
    .map((r) => [releaseOf(r[c.date]) / 60000, r[c.noncommercial_net], r[c.commercial_net], r[c.noncommercial_net_pct_oi], r[c.commercial_net_pct_oi]].map(num).join(','));
}

/** Records -> space-separated strings of at most `size` characters, never splitting a record. */
export function chunksOf(records, size = CHUNK) {
  const out = [];
  let cur = '';
  for (const rec of records) {
    if (cur && cur.length + 1 + rec.length > size) {
      out.push(cur);
      cur = rec;
    } else cur = cur ? `${cur} ${rec}` : rec;
  }
  if (cur) out.push(cur);
  return out;
}

/** The Pine data block: one function a market and a switch. */
export function dataBlock(byMarket) {
  const lines = [];
  for (const m of MARKETS) {
    const chunks = byMarket[m] ?? [];
    lines.push(`d${m}() => array.from(${chunks.length ? chunks.map((s) => `"${s}"`).join(',\n     ') : '""'})`);
  }
  lines.push('', 'chunksOf(string m) =>', '    switch m');
  for (const m of MARKETS) lines.push(`        "${m}" => d${m}()`);
  lines.push('        => array.new<string>()');
  return lines.join('\n');
}

export function render(template, byMarket, first, last) {
  return template.replaceAll('{{DATA}}', dataBlock(byMarket)).replaceAll('{{FIRST}}', first).replaceAll('{{LAST}}', last);
}

async function load(market, dataDir) {
  if (dataDir) return JSON.parse(fs.readFileSync(path.join(dataDir, 'legacy', `${market}.json`), 'utf8'));
  const res = await fetch(`${RAW}/legacy/${market}.json`);
  if (!res.ok) throw new Error(`${market}: ${res.status}`);
  return res.json();
}

async function main() {
  const arg = (name, fallback) => {
    const i = process.argv.indexOf(`--${name}`);
    return i > 0 ? process.argv[i + 1] : fallback;
  };
  const dataDir = arg('data');
  const since = arg('since', '2016-01-01');
  const byMarket = {};
  let first = '9999';
  let last = '';
  for (const m of MARKETS) {
    const file = await load(m, dataDir && path.resolve(dataDir));
    byMarket[m] = chunksOf(recordsOf(file, since));
    const dates = file.rows.map((r) => r[0]).filter((d) => d >= since);
    if (dates[0] < first) first = dates[0];
    if (dates.at(-1) > last) last = dates.at(-1);
  }
  const template = fs.readFileSync(path.join(ROOT, 'pine', 'template.pine'), 'utf8');
  const out = render(template, byMarket, first, last);
  const file = path.join(ROOT, 'pine', 'cot-positioning.pine');
  const before = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  if (before !== out) fs.writeFileSync(file, out);
  console.log(`${before === out ? 'unchanged' : 'written'}: pine/cot-positioning.pine, reports ${first} to ${last}, ${(out.length / 1024).toFixed(0)} KB`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
