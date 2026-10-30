import UrlQueryBuilder from '@enesusta/url-query-builder';

export type UriQuery = Record<string, string | number | boolean | null | undefined>;

/**
 * Builds a URI from a base and a query object. The query is composed by
 * @enesusta/url-query-builder; every value is percent-encoded first,
 * because the builder interpolates values verbatim. Entries whose value
 * is null or undefined are omitted, and an empty query returns the base
 * unchanged. Callback destinations are carried in the `next` parameter
 * (see buildUriWithNext) — that name is the single convention across
 * every app.
 */
export function buildUri(base: string, query: UriQuery = {}): string {
  const entry: Record<string, string> = {};
  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined) continue;
    entry[key] = encodeURIComponent(String(value));
  }
  if (Object.keys(entry).length === 0) return base;
  const built = new UrlQueryBuilder(entry).build();
  return base.includes('?') ? `${base}&${built.slice(1)}` : `${base}${built}`;
}

/** Builds the URI of a page that continues to `next` once it finishes (sign-in, sign-out, callbacks). */
export function buildUriWithNext(base: string, next: string): string {
  return buildUri(base, { next });
}
