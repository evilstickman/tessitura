/**
 * Adds a `deletedAt: null` filter to the `where` clause of query args,
 * unless the caller has explicitly set `deletedAt`.
 */
export function addSoftDeleteFilter<T extends Record<string, unknown> | undefined>(
  args: T,
): T & { where: { deletedAt: null } } {
  const result = { ...(args ?? {}) } as Record<string, unknown>;

  if (!result.where) {
    result.where = {};
  }

  const where = result.where as Record<string, unknown>;

  // Only add the filter if the caller hasn't explicitly set deletedAt
  if (!('deletedAt' in where)) {
    where.deletedAt = null;
  }

  return result as T & { where: { deletedAt: null } };
}
