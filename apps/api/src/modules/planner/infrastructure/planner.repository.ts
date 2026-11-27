import { Injectable } from '@nestjs/common';
import { and, asc, eq, gte, lte } from 'drizzle-orm';
import type { CreatePlannerItem, PlannerItem, PlannerPriority, PlannerStatus, UpdatePlannerItem } from '@pyneath/contracts';
import { PostgresUnitOfWork } from '../../../platform/database/postgres-unit-of-work';
import type { PlannerRepositoryPort } from '../application/planner.service';
import { plannerItems, type PlannerItemRow } from './planner.schema';

function toDto(row: PlannerItemRow): PlannerItem {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    scheduledDate: row.scheduledDate,
    startTime: row.startTime,
    durationMinutes: row.durationMinutes,
    priority: row.priority as PlannerPriority,
    status: row.status as PlannerStatus,
    linkedSessionId: row.linkedSessionId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

@Injectable()
export class DrizzlePlannerRepository implements PlannerRepositoryPort {
  constructor(private readonly transactions: PostgresUnitOfWork) {}

  async list(accountId: string, range?: { from?: string; to?: string }): Promise<PlannerItem[]> {
    const conditions = [eq(plannerItems.accountId, accountId)];
    if (range?.from) conditions.push(gte(plannerItems.scheduledDate, range.from));
    if (range?.to) conditions.push(lte(plannerItems.scheduledDate, range.to));
    const rows = await this.transactions.reader()
      .select()
      .from(plannerItems)
      .where(and(...conditions))
      .orderBy(asc(plannerItems.scheduledDate), asc(plannerItems.startTime), asc(plannerItems.createdAt));
    return rows.map(toDto);
  }

  async create(accountId: string, input: CreatePlannerItem): Promise<PlannerItem> {
    const [row] = await this.transactions.reader()
      .insert(plannerItems)
      .values({
        accountId,
        title: input.title,
        description: input.description ?? null,
        scheduledDate: input.scheduledDate,
        startTime: input.startTime ?? null,
        durationMinutes: input.durationMinutes ?? 25,
        priority: input.priority ?? 'medium',
        status: 'todo',
      })
      .returning();
    return toDto(row);
  }

  async update(accountId: string, id: string, input: UpdatePlannerItem): Promise<PlannerItem | null> {
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (input.title !== undefined) patch.title = input.title;
    if (input.description !== undefined) patch.description = input.description;
    if (input.scheduledDate !== undefined) patch.scheduledDate = input.scheduledDate;
    if (input.startTime !== undefined) patch.startTime = input.startTime;
    if (input.durationMinutes !== undefined) patch.durationMinutes = input.durationMinutes;
    if (input.priority !== undefined) patch.priority = input.priority;
    if (input.status !== undefined) patch.status = input.status;
    if (input.linkedSessionId !== undefined) patch.linkedSessionId = input.linkedSessionId;

    const [row] = await this.transactions.reader()
      .update(plannerItems)
      .set(patch)
      .where(and(eq(plannerItems.id, id), eq(plannerItems.accountId, accountId)))
      .returning();
    return row ? toDto(row) : null;
  }

  async remove(accountId: string, id: string): Promise<boolean> {
    const rows = await this.transactions.reader()
      .delete(plannerItems)
      .where(and(eq(plannerItems.id, id), eq(plannerItems.accountId, accountId)))
      .returning({ id: plannerItems.id });
    return rows.length > 0;
  }
}
