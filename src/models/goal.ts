import { prisma } from '@/lib/db';
import { ConflictError, ValidationError } from '@/lib/errors';

/**
 * Valid goalType enum values — kept in sync with the Prisma GoalType enum.
 * Declared here so validation can run without importing the generated client.
 */
const GOAL_TYPES = ['DAILY_MINUTES', 'WEEKLY_MINUTES', 'WEEKLY_SESSIONS', 'MONTHLY_GRIDS'] as const;
type GoalType = (typeof GOAL_TYPES)[number];

function isGoalType(value: unknown): value is GoalType {
  return typeof value === 'string' && (GOAL_TYPES as readonly string[]).includes(value);
}

export interface GoalInput {
  goalType: string;
  targetValue: number;
}

export interface ValidatedGoalInput {
  goalType: GoalType;
  targetValue: number;
}

export interface GoalUpdateInput {
  targetValue?: number;
  active?: boolean;
}

export interface ValidatedGoalUpdate {
  targetValue?: number;
  active?: boolean;
}

function validateTargetValue(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 10000) {
    throw new ValidationError('targetValue must be an integer between 1 and 10000');
  }
  return value;
}

/**
 * Validates a PracticeGoal create payload. Pure function — no DB access.
 */
export function validateGoalInput(input: GoalInput): ValidatedGoalInput {
  if (!isGoalType(input?.goalType)) {
    throw new ValidationError(
      `goalType must be one of: ${GOAL_TYPES.join(', ')}`,
    );
  }
  const targetValue = validateTargetValue(input.targetValue);
  return { goalType: input.goalType, targetValue };
}

/**
 * Validates a PracticeGoal update payload. Pure function — no DB access.
 *
 * `goalType` is explicitly rejected: the measurement unit is immutable after
 * creation (user must deactivate + re-create to change units). The error
 * message is user-facing and must contain "goalType" + "cannot be changed"
 * for the integration tests.
 */
export function validateGoalUpdate(input: GoalUpdateInput): ValidatedGoalUpdate {
  if ('goalType' in (input as object)) {
    throw new ValidationError('goalType cannot be changed after creation');
  }

  const result: ValidatedGoalUpdate = {};
  if (input.targetValue !== undefined) {
    result.targetValue = validateTargetValue(input.targetValue);
  }
  if (input.active !== undefined) {
    if (typeof input.active !== 'boolean') {
      throw new ValidationError('active must be a boolean');
    }
    result.active = input.active;
  }
  return result;
}

/**
 * Scopes a findFirst to the given goal + user. Query-driven ownership.
 */
async function findOwnedGoal(goalId: string, userId: string) {
  return prisma.practiceGoal.findFirst({
    where: { id: goalId, userId, deletedAt: null },
  });
}

/**
 * Creates a PracticeGoal. Enforces the "one active goal per goalType" rule:
 * if an active goal of the same type already exists, throws ConflictError
 * (controller returns 409). The user must deactivate the existing goal
 * before creating a new one with the same goalType.
 *
 * Inactive goals of the same type are unlimited — they are historical records.
 */
export async function createGoal(userId: string, input: GoalInput) {
  const validated = validateGoalInput(input);

  const existing = await prisma.practiceGoal.findFirst({
    where: {
      userId,
      goalType: validated.goalType,
      active: true,
      deletedAt: null,
    },
  });
  if (existing) {
    throw new ConflictError(
      `An active goal of type ${validated.goalType} already exists. Deactivate it before creating a new one.`,
    );
  }

  return prisma.practiceGoal.create({
    data: {
      userId,
      goalType: validated.goalType,
      targetValue: validated.targetValue,
      active: true,
    },
  });
}

/**
 * Lists goals for a user. Default: active only. Pass `all: true` to include
 * inactive historical goals as well. Sorted by createdAt desc.
 */
export async function listGoals(userId: string, all = false) {
  return prisma.practiceGoal.findMany({
    where: {
      userId,
      deletedAt: null,
      ...(all ? {} : { active: true }),
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getGoalById(goalId: string, userId: string) {
  return findOwnedGoal(goalId, userId);
}

/**
 * Updates a goal's targetValue and/or active flag. Throws ValidationError
 * if the caller tries to change goalType.
 */
export async function updateGoal(goalId: string, userId: string, input: GoalUpdateInput) {
  const goal = await findOwnedGoal(goalId, userId);
  if (!goal) return null;

  const validated = validateGoalUpdate(input);
  if (Object.keys(validated).length === 0) return goal;

  return prisma.practiceGoal.update({
    where: { id: goalId },
    data: validated,
  });
}

/**
 * Soft-deletes a goal via the extension-backed delete interceptor.
 */
export async function deleteGoal(goalId: string, userId: string): Promise<boolean> {
  const goal = await findOwnedGoal(goalId, userId);
  if (!goal) return false;

  await prisma.practiceGoal.delete({ where: { id: goalId } });
  return true;
}
