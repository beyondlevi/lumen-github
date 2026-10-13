import {formatTag, t} from '../i18n/strings';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "5 minutes ago", "yesterday", "3 weeks ago", in the wearer's language; under a minute, "just now". */
export function timeAgo(date: Date, now: Date, tag: string = formatTag()): string {
  const elapsed = now.getTime() - date.getTime();
  if (elapsed < MINUTE) return t('justNow');
  const format = new Intl.RelativeTimeFormat(tag, {numeric: 'auto'});
  if (elapsed < HOUR) return format.format(-Math.floor(elapsed / MINUTE), 'minute');
  if (elapsed < DAY) return format.format(-Math.floor(elapsed / HOUR), 'hour');
  const days = Math.floor(elapsed / DAY);
  if (days < 7) return format.format(-days, 'day');
  if (days < 30) return format.format(-Math.floor(days / 7), 'week');
  if (days < 365) return format.format(-Math.floor(days / 30), 'month');
  return format.format(-Math.floor(days / 365), 'year');
}

/** "13 Oct 2026, 20:15" (or the locale's own order and clock). */
export function dateTime(date: Date, tag: string = formatTag()): string {
  return new Intl.DateTimeFormat(tag, {day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit'}).format(date);
}

/** "20:15" or "8:15 PM". */
export function clockTime(date: Date, tag: string = formatTag()): string {
  return new Intl.DateTimeFormat(tag, {hour: 'numeric', minute: '2-digit'}).format(date);
}

export function shortSha(sha: string): string {
  return sha.slice(0, 7);
}

/** "1,284" or "1.284". */
export function formatCount(count: number, tag: string = formatTag()): string {
  return new Intl.NumberFormat(tag).format(count);
}
