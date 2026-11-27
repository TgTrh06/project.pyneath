import type { CreatePlannerItem, PlannerItem, UpdatePlannerItem } from '@pyneath/contracts';
import type { PlannerAccess } from './planner.ports';

export interface PlannerRepositoryPort {
  list(accountId: string, range?: { from?: string; to?: string }): Promise<PlannerItem[]>;
  create(accountId: string, input: CreatePlannerItem): Promise<PlannerItem>;
  update(accountId: string, id: string, input: UpdatePlannerItem): Promise<PlannerItem | null>;
  remove(accountId: string, id: string): Promise<boolean>;
}

export class PlannerNotFoundError extends Error {
  constructor() {
    super('Planner item not found');
  }
}

export class PlannerService implements PlannerAccess {
  constructor(private readonly repository: PlannerRepositoryPort) {}

  list(accountId: string, range?: { from?: string; to?: string }): Promise<PlannerItem[]> {
    return this.repository.list(accountId, range);
  }

  create(accountId: string, input: CreatePlannerItem): Promise<PlannerItem> {
    return this.repository.create(accountId, input);
  }

  async update(accountId: string, id: string, input: UpdatePlannerItem): Promise<PlannerItem> {
    const updated = await this.repository.update(accountId, id, input);
    if (!updated) throw new PlannerNotFoundError();
    return updated;
  }

  async remove(accountId: string, id: string): Promise<void> {
    const deleted = await this.repository.remove(accountId, id);
    if (!deleted) throw new PlannerNotFoundError();
  }
}
