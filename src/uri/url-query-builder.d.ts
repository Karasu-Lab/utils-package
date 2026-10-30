declare module '@enesusta/url-query-builder' {
  /** Composes a query string from an object: `new UrlQueryBuilder({ a: '1' }).build()` returns `"?a=1"`. */
  export default class UrlQueryBuilder {
    constructor(entry: Record<string, string>);
    build(): string;
  }
}
