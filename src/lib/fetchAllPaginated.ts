/**
 * Pagination helpers to bypass the PostgREST 1000-row response cap.
 *
 * Supabase / PostgREST returns at most 1000 rows per request by default.
 * These helpers loop `.range(from, to)` in fixed-size pages until all rows
 * have been fetched.
 */

const DEFAULT_PAGE_SIZE = 1000;

type PostgrestQueryLike<T> = {
  range: (from: number, to: number) => Promise<{ data: T[] | null; error: any }>;
};

/**
 * Fetches every row from a Supabase query builder by paginating with .range().
 * Pass a *factory* that returns a fresh query each call — the same builder
 * cannot be re-executed with a new range.
 *
 * Usage:
 *   const rows = await fetchAllPaginated<Visit>(() =>
 *     supabase.from('visits').select('id, visit_date').order('visit_date')
 *   );
 */
export async function fetchAllPaginated<T = any>(
  queryFactory: () => PostgrestQueryLike<T>,
  pageSize: number = DEFAULT_PAGE_SIZE
): Promise<T[]> {
  const all: T[] = [];
  let from = 0;
  // Safety cap: 500 pages = 500k rows. Prevents runaway loops.
  for (let page = 0; page < 500; page++) {
    const to = from + pageSize - 1;
    const { data, error } = await queryFactory().range(from, to);
    if (error) throw error;
    const batch = data || [];
    all.push(...batch);
    if (batch.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

/**
 * Paginated variant for RPC calls. PostgREST supports the Range header on
 * `.rpc()` when the function returns SETOF / TABLE.
 *
 *   const rows = await fetchAllPaginatedRpc<Visit>(() =>
 *     supabase.rpc('get_user_visits', { _user_id, _user_type, _user_role })
 *   );
 */
export async function fetchAllPaginatedRpc<T = any>(
  rpcFactory: () => PostgrestQueryLike<T>,
  pageSize: number = DEFAULT_PAGE_SIZE
): Promise<T[]> {
  return fetchAllPaginated<T>(rpcFactory, pageSize);
}
