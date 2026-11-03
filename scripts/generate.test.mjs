import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { releaseOf, recordsOf, chunksOf, dataBlock, render, MARKETS, CHUNK } from './generate.mjs';

const file = {
  columns: ['date', 'open_interest', 'noncommercial_net', 'noncommercial_net_pct_oi', 'commercial_net', 'commercial_net_pct_oi'],
  rows: [
    ['2015-12-29', 1, 5, 50, -5, -50],
    ['2026-10-20', 865000, -134524, -15.55, 104895, 12.13],
    ['2026-10-27', 868188, -143894, -16.57, 114484, null],
  ],
};

test('release time: Friday 15:30 New York, summer and winter', () => {
  assert.equal(new Date(releaseOf('2026-10-27')).toISOString(), '2026-10-30T19:30:00.000Z');
  assert.equal(new Date(releaseOf('2026-12-01')).toISOString(), '2026-12-04T20:30:00.000Z');
});

test('records: release minutes, nets, shares of open interest; a missing value is empty', () => {
  const recs = recordsOf(file, '2022-01-01');
  assert.equal(recs.length, 2);
  assert.equal(recs[1], `${releaseOf('2026-10-27') / 60000},-143894,114484,-16.57,`);
  assert.equal(recs[1].split(',').length, 5, 'Pine reads five fields');
});

test('chunks stay under the size and never split a record', () => {
  const recs = Array.from({ length: 2000 }, (_, i) => `${29000000 + i},-123456,654321,-15.55,12.13`);
  const chunks = chunksOf(recs);
  assert.ok(chunks.every((c) => c.length <= CHUNK));
  assert.deepEqual(chunks.join(' ').split(' '), recs);
});

test('the data block has every market and no quote inside a literal', () => {
  const block = dataBlock({ EUR: ['1,2,3,4,5'] });
  for (const m of MARKETS) assert.match(block, new RegExp(`"${m}" => d${m}\\(\\)`));
  assert.match(block, /dEUR\(\) => array\.from\("1,2,3,4,5"\)/);
  assert.match(block, /dXAU\(\) => array\.from\(""\)/);
});

test('the template renders with nothing left to fill', () => {
  const template = fs.readFileSync(new URL('../pine/template.pine', import.meta.url), 'utf8');
  const out = render(template, { EUR: ['1,2,3,4,5'] }, '2022-01-04', '2026-10-27');
  assert.doesNotMatch(out, /\{\{/);
  assert.match(out, /^\/\/@version=6$/m);
  assert.match(out, /chunksOf\(string m\) =>/);
});

test('the published script names no website (TradingView House Rules)', () => {
  const pine = new URL('../pine/cot-positioning.pine', import.meta.url);
  const desc = new URL('../tradingview/description.txt', import.meta.url);
  for (const f of [pine, desc]) {
    if (!fs.existsSync(f)) continue;
    const text = fs.readFileSync(f, 'utf8');
    assert.doesNotMatch(text, /https?:\/\/|www\.|\.com\b|forexiapro|telegram/i, f.pathname);
  }
});

test('the indicator shows positions only: no index, no extremes', () => {
  for (const f of ['../pine/template.pine', '../pine/cot-positioning.pine', '../tradingview/description.txt']) {
    const url = new URL(f, import.meta.url);
    if (!fs.existsSync(url)) continue;
    const text = fs.readFileSync(url, 'utf8').replace(/US dollar index/g, '');
    assert.doesNotMatch(text, /index|extreme|Idx/i, f);
  }
});

test('alerts on the speculators crossing zero', () => {
  const pine = fs.readFileSync(new URL('../pine/template.pine', import.meta.url), 'utf8');
  assert.match(pine, /alertcondition\(flipLong, "Speculators flip net long"/);
  assert.match(pine, /alertcondition\(flipShort, "Speculators flip net short"/);
  assert.equal((pine.match(/alertcondition\(/g) ?? []).length, 2);
});
