import type { CreatePlannerItem, PlannerItem, UpdatePlannerItem } from '@pyneath/contracts';

export const PLANNER_ACCESS = Symbol('PLANNER_ACCESS');

export interface PlannerAccess {
  list(accountId: string, range?: { from?: string; to?: string }): Promise<PlannerItem[]>;
  create(accountId: string, input: CreatePlannerItem): Promise<PlannerItem>;
  update(accountId: string, id: string, input: UpdatePlannerItem): Promise<PlannerItem>;
  remove(accountId: string, id: string): Promise<void>;
}
