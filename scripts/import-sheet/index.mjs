#!/usr/bin/env node
// Scouting spreadsheet → SQL file in supabase/venues/.
//
//   npm run import-sheet -- <files or folders>
//
// Pass the CSV downloads of the Bars, Deals and (optional) Menus tabs, or the folder they're in
// (e.g. your Downloads folder). Files are recognized by "Bars", "Deals" or "Menus" in their name;
// if a folder has several, the newest one wins. Nothing touches the database: you run the
// generated file in the Supabase SQL Editor.

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildImport, parseCsv, toRecords, toSql } from './parse.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT_DIR = join(ROOT, 'supabase', 'venues');
const TABS = ['bars', 'deals', 'menus'];

function tabOf(file) {
  const name = basename(file).toLowerCase();
  if (!name.endsWith('.csv')) return null;
  return TABS.find((t) => name.includes(t)) ?? null;
}

function findFiles(args) {
  const found = {};
  const consider = (file) => {
    const tab = tabOf(file);
    if (!tab) return;
    const mtime = statSync(file).mtimeMs;
    if (!found[tab] || mtime > found[tab].mtime) found[tab] = { file, mtime };
  };
  for (const arg of args) {
    const p = resolve(arg);
    if (!existsSync(p)) {
      console.error(`Not found: ${arg}`);
      process.exit(1);
    }
    if (statSync(p).isDirectory()) readdirSync(p).forEach((f) => consider(join(p, f)));
    else consider(p);
  }
  return found;
}

function nextFileNumber() {
  const nums = readdirSync(OUT_DIR)
    .map((f) => Number(f.match(/^(\d+)_/)?.[1]))
    .filter((n) => Number.isFinite(n));
  return String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3, '0');
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('Usage: npm run import-sheet -- <Bars/Deals/Menus CSV files, or the folder they are in>');
  process.exit(1);
}

const files = findFiles(args);
if (!files.bars) {
  console.error('Couldn’t find the Bars tab. Download it as CSV (File → Download → .csv) and pass it or its folder.');
  process.exit(1);
}
for (const tab of TABS) console.log(`${tab.padEnd(6)} ${files[tab] ? files[tab].file : '(none)'}`);

const read = (tab) => (files[tab] ? toRecords(parseCsv(readFileSync(files[tab].file, 'utf8'))) : []);
const { bars, errors, warnings } = buildImport({ bars: read('bars'), deals: read('deals'), menus: read('menus') });

for (const w of warnings) console.log(`⚠  ${w}`);
if (errors.length > 0) {
  console.error(`\n${errors.length} problem${errors.length === 1 ? '' : 's'} to fix in the sheet first:`);
  for (const e of errors) console.error(`✗  ${e}`);
  process.exit(1);
}

const date = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' }); // YYYY-MM-DD
const out = join(OUT_DIR, `${nextFileNumber()}_import_${date}.sql`);
const dealCount = bars.reduce((n, b) => n + b.deals.length, 0);
writeFileSync(out, toSql(bars, { label: `Sheet import, ${date}: ${bars.length} bars, ${dealCount} deals` }));
console.log(`\n✓ ${bars.length} bars, ${dealCount} deals → ${out}`);
console.log('Next: open that file, paste it into the Supabase SQL Editor and click Run.');
