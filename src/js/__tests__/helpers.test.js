import { esc, trunc, fullTs, shortTs } from '../helpers.js';

describe('esc', () => {
  test('escapes &', () => expect(esc('a & b')).toBe('a &amp; b'));
  test('escapes <', () => expect(esc('<b>bold</b>')).toBe('&lt;b&gt;bold&lt;/b&gt;'));
  test('escapes >', () => expect(esc('1 > 0')).toBe('1 &gt; 0'));
  test('leaves safe strings unchanged', () => expect(esc('hello world')).toBe('hello world'));
  test('coerces non-strings', () => expect(esc(42)).toBe('42'));
});

describe('trunc', () => {
  test('shows first 8 and last 4 chars', () => {
    expect(trunc('abcdefgh-ijkl-mnop-qrst-uvwxyz123456')).toBe('abcdefgh…3456');
  });
});

describe('timestamps', () => {
  test('fullTs returns a time string', () => {
    const result = fullTs(Date.now());
    expect(result).toMatch(/\d{1,2}:\d{2}:\d{2}/);
  });

  test('shortTs returns a shorter time string', () => {
    const result = shortTs(Date.now());
    expect(result).toMatch(/\d{1,2}:\d{2}/);
    expect(result.length).toBeLessThan(fullTs(Date.now()).length);
  });
});
