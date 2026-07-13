export const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// targetMonth is a free-text field on the Current tab (e.g. "2025-10" or "Nov-25"), so anything
// reading it back needs to parse both shapes rather than assuming one format.
export function parseMonthValue(targetMonth) {
  const raw = String(targetMonth ?? '').trim();

  const abbrMatch = raw.match(/^([A-Za-z]{3})-(\d{2})$/);
  if (abbrMatch) {
    const monthIndex = MONTH_ABBR.findIndex((abbr) => abbr.toLowerCase() === abbrMatch[1].toLowerCase());
    if (monthIndex !== -1) return { year: 2000 + Number(abbrMatch[2]), month: monthIndex + 1 };
  }

  const compact = raw.replace(/[-/\s]/g, '');
  if (/^\d{6}$/.test(compact)) {
    const year = Number(compact.slice(0, 4));
    const month = Number(compact.slice(4, 6));
    if (month >= 1 && month <= 12) return { year, month };
  }

  return null;
}

export function addMonths(parsed, offset) {
  const zeroBased = parsed.month - 1 + offset;
  const year = parsed.year + Math.floor(zeroBased / 12);
  const month = (((zeroBased % 12) + 12) % 12) + 1;
  return { year, month };
}

export function formatMonthShort(parsed) {
  if (!parsed) return null;
  return `${MONTH_ABBR[parsed.month - 1]}-${String(parsed.year % 100).padStart(2, '0')}`;
}

export function formatMonthLabel(targetMonth) {
  return formatMonthShort(parseMonthValue(targetMonth)) || String(targetMonth ?? '-');
}
