export type QuerySource = URLSearchParams | Record<string, unknown>;

export function getQueryValue(query: QuerySource, name: string): unknown {
  if (query instanceof URLSearchParams) {
    return query.get(name) ?? undefined;
  }

  return query[name];
}
