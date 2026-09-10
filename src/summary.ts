/**
 * The one line that stands for a record in a picker.
 *
 * A template rather than a function, because every client has to render it and
 * only one of them can run JavaScript. Deliberately small — anything that needs
 * more than this is a sign the app should be storing a different shape:
 *
 *     {key}      the value, or nothing
 *     {a|b}      a if it has a value, else b — `{route|from-to}`
 *     {a-b}      both joined by what sits between them, or nothing if either
 *                is missing, so a half-filled route is not rendered as `SVO-`
 *     BO{bo}     a literal glued to a token goes when the token does
 *
 * Whitespace left behind by a missing value collapses; whitespace you put
 * between two values that are both there is kept, so columns still line up.
 */
export function renderSummary(template: string, entry: Record<string, string>): string {
  const parts: string[] = [];
  let carry = '';

  // One pass: a token plus whatever literal is glued to its left, so the
  // literal can leave with it.
  const pattern = /([^\s{}]*)\{([^{}]+)\}/g;
  let at = 0;

  for (let match = pattern.exec(template); match; match = pattern.exec(template)) {
    carry += template.slice(at, match.index);
    at = match.index + match[0].length;

    const value = resolve(match[2] ?? '', entry);
    if (value) {
      parts.push(`${carry}${match[1] ?? ''}${value}`);
      carry = '';
    } else {
      // The token and its glued prefix are dropped; the separator before them
      // is dropped with them rather than doubling up.
      carry = carry.trimEnd() ? carry : '';
    }
  }
  const tail = `${carry}${template.slice(at)}`;
  if (tail.trim()) {
    parts.push(tail);
  }

  return parts.join('').replace(/^\s+|\s+$/g, '');
}

function resolve(token: string, entry: Record<string, string>): string {
  const bar = token.indexOf('|');
  if (bar !== -1) {
    const left = resolve(token.slice(0, bar), entry);

    return left || resolve(token.slice(bar + 1), entry);
  }

  // `{from-to}` and friends: two keys with a literal between them, present only
  // when both sides are.
  const joined = /^([A-Za-z_]\w*)(\W+)([A-Za-z_]\w*)$/.exec(token);
  if (joined) {
    const left = value(entry, joined[1]);
    const right = value(entry, joined[3]);

    return left && right ? `${left}${joined[2] ?? ''}${right}` : '';
  }

  return value(entry, token);
}

function value(entry: Record<string, string>, key: string | undefined): string {
  return key ? (entry[key] ?? '').trim() : '';
}
