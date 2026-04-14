type GoalType = 'DAILY_MINUTES' | 'WEEKLY_MINUTES' | 'WEEKLY_SESSIONS' | 'MONTHLY_GRIDS';

interface GoalRecord {
  id: string;
  userId: string;
  goalType: GoalType;
  targetValue: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export function formatGoal(goal: GoalRecord) {
  return {
    id: goal.id,
    goalType: goal.goalType,
    targetValue: goal.targetValue,
    active: goal.active,
    createdAt: goal.createdAt.toISOString(),
    updatedAt: goal.updatedAt.toISOString(),
  };
}

export function formatGoalList(goals: GoalRecord[]) {
  return goals.map(formatGoal);
}
