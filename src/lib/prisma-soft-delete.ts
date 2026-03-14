/**
 * Adds a `deletedAt: null` filter to query args, unless
 * the caller has already specified an explicit `deletedAt` value.
 */
export function addSoftDeleteFilter<T extends { where?: Record<string, unknown> }>(
  args: T,
): T & { where: Record<string, unknown> } {
  const where = args.where ?? {};

  // Only add the filter if deletedAt is not already specified
  if (!('deletedAt' in where)) {
    return { ...args, where: { ...where, deletedAt: null } };
  }

  return { ...args, where } as T & { where: Record<string, unknown> };
}
