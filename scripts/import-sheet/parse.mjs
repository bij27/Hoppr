// Turns the scouting spreadsheet (Bars, Deals and Menus tabs, downloaded as CSV) into bars and
// deals ready for the database. No side effects, so the tests can load it.

import { readFileSync } from 'node:fs';

/** The app's tag list (src/constants/tags.json), shared so the sheet and the app always agree. */
const TAG_LIST = JSON.parse(readFileSync(new URL('../../src/constants/tags.json', import.meta.url), 'utf8')).tags;
const TAG_LOOKUP = new Map();
for (const t of TAG_LIST) {
  for (const name of [t.slug, t.label, ...t.aliases]) TAG_LOOKUP.set(name.toLowerCase().replace(/[-_]/g, ' ').trim(), t);
}

/**
 * "pool, darts; Patio" → { slugs, problems }. group is 'features' for the Bars tab and 'events'
 * for the Deals tab.
 */
export function parseTags(text, group) {
  const slugs = [];
  const problems = [];
  for (const raw of (text ?? '').split(/[,;]/)) {
    const name = raw.trim();
    if (!name) continue;
    const tag = TAG_LOOKUP.get(name.toLowerCase().replace(/[-_]/g, ' ').trim());
    if (!tag) {
      const options = TAG_LIST.filter((t) => t.group === group).map((t) => t.label.toLowerCase());
      problems.push(`unknown tag "${name}" (use: ${options.join(', ')})`);
    } else if (tag.group !== group) {
      problems.push(group === 'features'
        ? `"${tag.label}" is a night/event tag; put it on the deal or event on the Deals tab`
        : `"${tag.label}" is a bar feature; put it in the tags column on the Bars tab`);
    } else if (!slugs.includes(tag.slug)) slugs.push(tag.slug);
  }
  return { slugs, problems };
}

/** Parses CSV text (RFC 4180: quoted fields, "" escapes, newlines inside quotes). */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  const src = text.replace(/^﻿/, '');
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += ch;
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** CSV rows → objects keyed by lower-case header, skipping blank rows. Keeps the sheet row number. */
export function toRecords(rows) {
  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => h.trim().toLowerCase());
  const out = [];
  for (let r = 1; r < rows.length; r++) {
    if (rows[r].every((c) => c.trim() === '')) continue;
    const rec = { _row: r + 1 };
    headers.forEach((h, i) => {
      if (h) rec[h] = (rows[r][i] ?? '').trim();
    });
    out.push(rec);
  }
  return out;
}

export function slugify(name) {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const DAY_NAMES = [
  ['sun', 'sunday', 'su'],
  ['mon', 'monday', 'mo'],
  ['tue', 'tues', 'tuesday', 'tu'],
  ['wed', 'weds', 'wednesday', 'we'],
  ['thu', 'thur', 'thurs', 'thursday', 'th'],
  ['fri', 'friday', 'fr'],
  ['sat', 'saturday', 'sa'],
];

function dayIndex(word) {
  const w = word.trim().toLowerCase().replace(/\.$/, '');
  const i = DAY_NAMES.findIndex((names) => names.includes(w));
  return i === -1 ? null : i;
}

/**
 * "Daily", "Weekdays", "Weekends", "Mon-Fri", "Fri–Sun", "Tue, Thu", "Mon to Wed, Sat"
 * → sorted day numbers (0 = Sun). null if it can't be read.
 */
export function parseDays(text) {
  const t = text.trim().toLowerCase();
  if (!t) return null;
  if (['daily', 'every day', 'everyday', 'all week', '7 days'].includes(t)) return [0, 1, 2, 3, 4, 5, 6];
  if (['weekdays', 'weekday', 'mon-fri'].includes(t)) return [1, 2, 3, 4, 5];
  if (['weekends', 'weekend'].includes(t)) return [0, 6];
  const set = new Set();
  for (const part of t.split(/[,/&]|\band\b/)) {
    const p = part.trim();
    if (!p) continue;
    const range = p.split(/\s*(?:-|–|—|\bto\b|\bthru\b|\bthrough\b)\s*/);
    if (range.length === 1) {
      const d = dayIndex(range[0]);
      if (d === null) return null;
      set.add(d);
    } else if (range.length === 2) {
      const a = dayIndex(range[0]);
      const b = dayIndex(range[1]);
      if (a === null || b === null) return null;
      for (let d = a; ; d = (d + 1) % 7) {
        set.add(d);
        if (d === b) break;
      }
    } else return null;
  }
  return set.size > 0 ? [...set].sort((x, y) => x - y) : null;
}

/**
 * "4 PM", "4pm", "4:30 p.m.", "16:00", "noon", "midnight", "12 AM" → minutes after midnight.
 * As an end time, midnight is 1440 (end of the day). null if it can't be read.
 */
export function parseTime(text, { end = false } = {}) {
  const t = text.trim().toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ');
  if (!t) return null;
  if (t === 'noon') return 720;
  if (t === 'midnight') return end ? 1440 : 0;
  const m = t.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm|a|p)?$/);
  if (!m) return null;
  let h = Number(m[1]);
  const min = m[2] ? Number(m[2]) : 0;
  const suffix = m[3];
  if (min > 59) return null;
  if (suffix) {
    if (h < 1 || h > 12) return null;
    if (suffix.startsWith('a')) h = h === 12 ? 0 : h;
    else h = h === 12 ? 12 : h + 12;
  } else if (h > 23 || !m[2]) {
    return null; // "4" alone is ambiguous; 24-hour times need minutes ("16:00").
  }
  const total = h * 60 + min;
  return end && total === 0 ? 1440 : total;
}

/** "26.158581, -80.100798" (Google Maps' copy format) → { lat, lng }. */
export function parseCoordinates(text) {
  const m = text.trim().match(/^\(?\s*(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)\s*\)?$/);
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

const CATEGORIES = {
  drinks: 'drinks',
  drink: 'drinks',
  food: 'food',
  both: 'both',
  'food & drinks': 'both',
  'food and drinks': 'both',
  'drinks & food': 'both',
  'drinks and food': 'both',
};

const YES = new Set(['', 'yes', 'y', 'true', '1', 'x']);
const NO = new Set(['no', 'n', 'false', '0', 'draft']);

/**
 * Validates the three tabs and joins them. Returns { bars, errors, warnings }; only import when
 * errors is empty. Bars and deals are matched by bar name (case-insensitive), deals and menu items
 * by bar + deal title.
 */
export function buildImport({ bars: barRecs = [], deals: dealRecs = [], menus: menuRecs = [] }) {
  const errors = [];
  const warnings = [];
  const bars = new Map();

  for (const r of barRecs) {
    const at = `Bars row ${r._row}`;
    const name = r.name ?? '';
    if (!name) {
      errors.push(`${at}: the name is empty.`);
      continue;
    }
    const key = name.toLowerCase();
    if (bars.has(key)) {
      errors.push(`${at}: "${name}" is listed twice.`);
      continue;
    }
    const coords = parseCoordinates(r.coordinates ?? '');
    if (!coords) {
      errors.push(`${at} (${name}): couldn't read the coordinates "${r.coordinates ?? ''}". In Google Maps, right-click the bar and click the numbers at the top to copy them.`);
      continue;
    }
    if (coords.lat < 24 || coords.lat > 31.5 || coords.lng < -88 || coords.lng > -79.5) {
      warnings.push(`${at} (${name}): those coordinates aren't in Florida. Check they're "latitude, longitude".`);
    }
    const publish = (r.publish ?? '').toLowerCase();
    if (!YES.has(publish) && !NO.has(publish)) {
      errors.push(`${at} (${name}): "publish" should be yes or no.`);
      continue;
    }
    const tags = parseTags(r.tags, 'features');
    if (tags.problems.length > 0) {
      errors.push(...tags.problems.map((p) => `${at} (${name}): ${p}.`));
      continue;
    }
    bars.set(key, {
      name,
      tags: tags.slugs,
      slug: slugify(name),
      neighborhood: r.neighborhood ?? '',
      address: r.address ?? '',
      ...coords,
      phone: r.phone || null,
      website: r.website || null,
      publish: !NO.has(publish),
      deals: new Map(),
    });
  }

  for (const r of dealRecs) {
    const barName = r.bar ?? '';
    const title = r.deal ?? '';
    const at = `Deals row ${r._row}${title ? ` (${title})` : ''}`;
    const bar = bars.get(barName.toLowerCase());
    if (!bar) {
      errors.push(`${at}: no bar named "${barName}" on the Bars tab.`);
      continue;
    }
    if (!title) {
      errors.push(`${at}: the deal is empty.`);
      continue;
    }
    if (bar.deals.has(title.toLowerCase())) {
      errors.push(`${at}: ${bar.name} already has a deal with this exact name. Make each one different.`);
      continue;
    }
    const days = parseDays(r.days ?? '');
    if (!days) errors.push(`${at}: couldn't read the days "${r.days ?? ''}". Try "Daily", "Mon-Fri" or "Tue, Thu".`);
    const start = parseTime(r.start ?? '');
    if (start === null) errors.push(`${at}: couldn't read the start time "${r.start ?? ''}". Try "4 PM" or "4:30 PM".`);
    const end = parseTime(r.end ?? '', { end: true });
    if (end === null) errors.push(`${at}: couldn't read the end time "${r.end ?? ''}". Try "7 PM", "midnight" or "2 AM".`);
    const type = (r.type ?? '').toLowerCase();
    const kind = type === 'event' ? 'event' : 'deal';
    const category = type === '' || kind === 'event' ? 'drinks' : CATEGORIES[type];
    if (!category) errors.push(`${at}: type should be drinks, food, both or event (not "${r.type}").`);
    const tags = parseTags(r.tags, 'events');
    errors.push(...tags.problems.map((p) => `${at}: ${p}.`));
    if (start !== null && end !== null && start === end % 1440) {
      errors.push(`${at}: the start and end times are the same.`);
    }
    if (!days || start === null || end === null || !category || start === end % 1440 || tags.problems.length > 0) continue;
    if (end <= start && end > 360) {
      warnings.push(`${at}: ends at or before it starts, so it's treated as running overnight. Check the times.`);
    }
    bar.deals.set(title.toLowerCase(), {
      title,
      kind,
      tags: tags.slugs,
      details: r.details || null,
      category,
      days,
      start,
      end,
      menu: [],
    });
  }

  for (const r of menuRecs) {
    const at = `Menus row ${r._row}`;
    const bar = bars.get((r.bar ?? '').toLowerCase());
    const deal = bar?.deals.get((r.deal ?? '').toLowerCase());
    if (!deal) {
      errors.push(`${at}: no deal "${r.deal ?? ''}" at "${r.bar ?? ''}" on the Deals tab. Copy the bar and deal names exactly.`);
      continue;
    }
    if (!r.item || !r.price) {
      errors.push(`${at}: needs both an item and a price.`);
      continue;
    }
    const sectionName = r.section || 'Menu';
    let section = deal.menu.find((s) => s.section === sectionName);
    if (!section) {
      section = { section: sectionName, items: [] };
      deal.menu.push(section);
    }
    section.items.push({ name: r.item, price: /^\d/.test(r.price) ? `$${r.price}` : r.price });
  }

  for (const bar of bars.values()) {
    if (bar.deals.size === 0) warnings.push(`${bar.name} has no deals yet. It will show as a bar with nothing listed.`);
  }

  return {
    bars: [...bars.values()].map((b) => ({ ...b, deals: [...b.deals.values()] })),
    errors,
    warnings,
  };
}

/** Tag slugs are [a-z0-9-] only (checked against the tag list), so no escaping is needed. */
const textArray = (slugs) => `'{${slugs.join(',')}}'::text[]`;

const q = (s) => (s === null || s === undefined ? 'null' : `'${String(s).replace(/'/g, "''")}'`);

/**
 * SQL that adds or updates every bar and deal. Safe to run again after editing the sheet:
 * bars are matched by name and deals by bar + title, so confirmations and reports stay attached.
 * Deals missing from the sheet are left alone (turn them off in Supabase if they've ended), and a
 * deal with no rows on the Menus tab keeps the menu it already has.
 */
export function toSql(bars, { label = 'sheet import' } = {}) {
  const lines = [
    `-- ${label}. Generated by scripts/import-sheet from the scouting spreadsheet.`,
    '-- Run in the Supabase SQL Editor. Safe to run again: bars match by name, deals by bar + title.',
    '-- Requires migration 20261111000000_tags_and_events.sql.',
    '',
    'begin;',
    '',
    '-- Bars',
    'with input (slug, name, neighborhood, address, lat, lng, phone, website, publish, tags) as (values',
    bars
      .map(
        (b) =>
          `  (${q(b.slug)}, ${q(b.name)}, ${q(b.neighborhood)}, ${q(b.address)}, ${b.lat}, ${b.lng}, ${q(b.phone)}, ${q(b.website)}, ${b.publish}, ${textArray(b.tags)})`,
      )
      .join(',\n'),
    '),',
    'updated as (',
    '  update public.venues v',
    '     set name = i.name, neighborhood = i.neighborhood, address = i.address,',
    '         location = extensions.st_point(i.lng, i.lat)::extensions.geography,',
    '         phone = i.phone, website = i.website, is_published = i.publish, tags = i.tags',
    '    from input i',
    '   where lower(v.name) = lower(i.name)',
    '  returning lower(v.name) as key',
    ')',
    'insert into public.venues (slug, name, neighborhood, address, location, phone, website, is_published, tags)',
    'select i.slug, i.name, i.neighborhood, i.address, extensions.st_point(i.lng, i.lat)::extensions.geography,',
    '       i.phone, i.website, i.publish, i.tags',
    '  from input i',
    ' where lower(i.name) not in (select key from updated);',
  ];

  const deals = bars.flatMap((b) => b.deals.map((d) => ({ bar: b.name, ...d })));
  if (deals.length > 0) {
    lines.push(
      '',
      '-- Deals (days: 0 = Sun ... 6 = Sat; times: minutes after midnight, 1440 = midnight close)',
      'with input (bar, title, kind, details, category, tags, days, start_minute, end_minute, menu) as (values',
      deals
        .map(
          (d) =>
            `  (${q(d.bar)}, ${q(d.title)}, ${q(d.kind)}, ${q(d.details)}, ${q(d.category)}, ${textArray(d.tags)}, '{${d.days.join(',')}}'::smallint[], ${d.start}, ${d.end}, ${
              d.menu.length > 0 ? `${q(JSON.stringify(d.menu))}::jsonb` : 'null::jsonb'
            })`,
        )
        .join(',\n'),
      '),',
      'matched as (',
      '  select i.*, v.id as venue_id from input i join public.venues v on lower(v.name) = lower(i.bar)',
      '),',
      'updated as (',
      '  update public.deals d',
      '     set kind = m.kind, details = m.details, category = m.category::public.deal_category, tags = m.tags, days = m.days,',
      '         start_minute = m.start_minute, end_minute = m.end_minute, menu = coalesce(m.menu, d.menu),',
      '         is_active = true, last_verified_at = now()',
      '    from matched m',
      '   where d.venue_id = m.venue_id and lower(d.title) = lower(m.title)',
      '  returning d.venue_id, lower(d.title) as key',
      ')',
      'insert into public.deals (venue_id, title, kind, details, category, tags, days, start_minute, end_minute, menu, last_verified_at)',
      'select m.venue_id, m.title, m.kind, m.details, m.category::public.deal_category, m.tags, m.days, m.start_minute, m.end_minute, m.menu, now()',
      '  from matched m',
      ' where not exists (select 1 from updated u where u.venue_id = m.venue_id and u.key = lower(m.title));',
    );
  }

  lines.push('', 'commit;', '');
  return lines.join('\n');
}
