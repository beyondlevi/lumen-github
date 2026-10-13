import {describe, expect, it} from 'vitest';
import {dictionaryKeys, formatTag, resolveLocale, translate, translatePlural} from '../../src/i18n/strings';
import {shortSha, timeAgo} from '../../src/time/format';

describe('strings', () => {
  it('has every English key in Portuguese, with the same placeholders', () => {
    expect(dictionaryKeys('pt').sort()).toEqual(dictionaryKeys('en').sort());
    for (const key of dictionaryKeys('en')) {
      const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();
      const typed = key as Parameters<typeof translate>[1];
      expect(placeholders(translate('pt', typed)), key).toEqual(placeholders(translate('en', typed)));
    }
  });

  it('picks Portuguese for any pt-* and English otherwise', () => {
    expect(resolveLocale(['pt-PT'])).toBe('pt');
    expect(resolveLocale(['fr-FR'])).toBe('en');
    expect(formatTag('en', 'en-GB')).toBe('en-GB');
    expect(formatTag('pt', 'pt')).toBe('pt-BR');
  });

  it('counts with plural forms', () => {
    expect(translatePlural('en', 'files', 1)).toBe('1 file');
    expect(translatePlural('en', 'ciFailure', 2)).toBe('2 checks failed');
    expect(translatePlural('pt', 'files', 5)).toBe('5 arquivos');
  });
});

describe('time', () => {
  const now = new Date('2026-10-13T20:15:00Z');
  const ago = (minutes: number) => new Date(now.getTime() - minutes * 60_000);

  it('says how long ago, in the right unit', () => {
    expect(timeAgo(ago(0.5), now, 'en-US')).toBe('just now');
    expect(timeAgo(ago(12), now, 'en-US')).toBe('12 minutes ago');
    expect(timeAgo(ago(125), now, 'en-US')).toBe('2 hours ago');
    expect(timeAgo(ago(26 * 60), now, 'en-US')).toBe('yesterday');
    expect(timeAgo(ago(15 * 24 * 60), now, 'en-US')).toBe('2 weeks ago');
    expect(timeAgo(ago(400 * 24 * 60), now, 'en-US')).toBe('last year');
    expect(timeAgo(ago(12), now, 'pt-BR')).toBe('há 12 minutos');
  });

  it('shortens a SHA to 7 characters', () => {
    expect(shortSha('d8e2b440f932d968511532c61a3aeef1d1c91553')).toBe('d8e2b44');
  });
});
