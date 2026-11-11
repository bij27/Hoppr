import { describe, expect, it } from 'vitest';

import { buildImport, parseCoordinates, parseCsv, parseDays, parseTime, slugify, toRecords, toSql } from './parse.mjs';

describe('parseCsv', () => {
  it('handles quotes, escaped quotes, commas and newlines inside fields', () => {
    expect(parseCsv('a,b\r\n"1, 2","say ""hi""\nthere"\n')).toEqual([
      ['a', 'b'],
      ['1, 2', 'say "hi"\nthere'],
    ]);
  });

  it('turns rows into records and skips blank rows', () => {
    expect(toRecords(parseCsv('Name,Days\nKubo,Daily\n,\nDel Mar,Wed'))).toEqual([
      { _row: 2, name: 'Kubo', days: 'Daily' },
      { _row: 4, name: 'Del Mar', days: 'Wed' },
    ]);
  });
});

describe('parseDays', () => {
  it('reads common ways of writing days', () => {
    expect(parseDays('Daily')).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(parseDays('weekdays')).toEqual([1, 2, 3, 4, 5]);
    expect(parseDays('Weekends')).toEqual([0, 6]);
    expect(parseDays('Mon-Fri')).toEqual([1, 2, 3, 4, 5]);
    expect(parseDays('Fri – Sun')).toEqual([0, 5, 6]);
    expect(parseDays('Tue, Thu')).toEqual([2, 4]);
    expect(parseDays('Monday to Wednesday & Saturday')).toEqual([1, 2, 3, 6]);
    expect(parseDays('Thurs')).toEqual([4]);
  });

  it('returns null for anything it cannot read', () => {
    expect(parseDays('')).toBeNull();
    expect(parseDays('sometimes')).toBeNull();
  });
});

describe('parseTime', () => {
  it('reads 12- and 24-hour times', () => {
    expect(parseTime('4 PM')).toBe(960);
    expect(parseTime('4pm')).toBe(960);
    expect(parseTime('4:30 p.m.')).toBe(990);
    expect(parseTime('11 AM')).toBe(660);
    expect(parseTime('12 PM')).toBe(720);
    expect(parseTime('noon')).toBe(720);
    expect(parseTime('16:00')).toBe(960);
    expect(parseTime('2 AM', { end: true })).toBe(120);
  });

  it('treats midnight as the end of the day when it is an end time', () => {
    expect(parseTime('midnight')).toBe(0);
    expect(parseTime('midnight', { end: true })).toBe(1440);
    expect(parseTime('12 AM', { end: true })).toBe(1440);
  });

  it('rejects ambiguous or invalid times', () => {
    expect(parseTime('4')).toBeNull();
    expect(parseTime('13 PM')).toBeNull();
    expect(parseTime('close')).toBeNull();
  });
});

describe('parseCoordinates and slugify', () => {
  it('reads Google Maps coordinates', () => {
    expect(parseCoordinates('26.1585813637066, -80.1007987456949')).toEqual({ lat: 26.1585813637066, lng: -80.1007987456949 });
    expect(parseCoordinates('nope')).toBeNull();
  });

  it('makes URL-safe slugs', () => {
    expect(slugify('Kubo Asian Fusion & Bar')).toBe('kubo-asian-fusion-and-bar');
    expect(slugify("Café O'Malley's")).toBe('cafe-o-malley-s');
  });
});

const bar = { _row: 2, name: 'Shooters', coordinates: '26.14, -80.10', publish: '' };
const deal = { _row: 2, bar: 'shooters', deal: '$5 margs', type: '', days: 'Mon-Fri', start: '4 PM', end: '7 PM' };

describe('buildImport', () => {
  it('joins bars, deals and menus', () => {
    const { bars, errors } = buildImport({
      bars: [bar],
      deals: [deal],
      menus: [
        { _row: 2, bar: 'Shooters', deal: '$5 margs', section: 'Drinks', item: 'Margarita', price: '5' },
        { _row: 3, bar: 'Shooters', deal: '$5 margs', section: 'Drinks', item: 'Frozen', price: '$6' },
      ],
    });
    expect(errors).toEqual([]);
    expect(bars[0]).toMatchObject({ name: 'Shooters', slug: 'shooters', lat: 26.14, lng: -80.1, publish: true });
    expect(bars[0].deals[0]).toMatchObject({ category: 'drinks', days: [1, 2, 3, 4, 5], start: 960, end: 1140 });
    expect(bars[0].deals[0].menu).toEqual([
      { section: 'Drinks', items: [{ name: 'Margarita', price: '$5' }, { name: 'Frozen', price: '$6' }] },
    ]);
  });

  it('reports every problem with its row number', () => {
    const { errors } = buildImport({
      bars: [bar, { ...bar, _row: 3 }, { _row: 4, name: 'Nowhere', coordinates: 'x' }],
      deals: [
        { ...deal, _row: 2, days: 'someday', start: 'close' },
        { ...deal, _row: 3, bar: 'Ghost Bar' },
      ],
    });
    expect(errors).toEqual([
      'Bars row 3: "Shooters" is listed twice.',
      expect.stringContaining('Bars row 4 (Nowhere): couldn\'t read the coordinates'),
      expect.stringContaining('Deals row 2 ($5 margs): couldn\'t read the days "someday"'),
      expect.stringContaining('Deals row 2 ($5 margs): couldn\'t read the start time "close"'),
      'Deals row 3 ($5 margs): no bar named "Ghost Bar" on the Bars tab.',
    ]);
  });
});

describe('toSql', () => {
  it('escapes quotes and writes days, minutes and menus', () => {
    const { bars } = buildImport({ bars: [{ ...bar, name: "Joe's" }], deals: [{ ...deal, bar: "Joe's" }] });
    const sql = toSql(bars);
    expect(sql).toContain("'Joe''s'");
    expect(sql).toContain("'{1,2,3,4,5}'::smallint[], 960, 1140, null::jsonb");
    expect(sql.trim().startsWith('--')).toBe(true);
    expect(sql).toContain('commit;');
  });
});
