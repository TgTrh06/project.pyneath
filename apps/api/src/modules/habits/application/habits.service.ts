import type { CreateHabit, HabitLog, HabitWithStats, ToggleHabitLog, UpdateHabit } from '@pyneath/contracts';
import type { HabitsAccess } from './habits.ports';

export interface HabitsRepositoryPort {
  list(accountId: string, today: string): Promise<HabitWithStats[]>;
  create(accountId: string, input: CreateHabit, today: string): Promise<HabitWithStats>;
  update(accountId: string, id: string, input: UpdateHabit, today: string): Promise<HabitWithStats | null>;
  toggleLog(accountId: string, habitId: string, input: ToggleHabitLog): Promise<HabitLog | null>;
  remove(accountId: string, id: string): Promise<boolean>;
}

export class HabitNotFoundError extends Error {
  constructor() {
    super('Habit not found');
  }
}

export class HabitsService implements HabitsAccess {
  constructor(private readonly repository: HabitsRepositoryPort) {}

  list(accountId: string, today: string): Promise<HabitWithStats[]> {
    return this.repository.list(accountId, today);
  }

  create(accountId: string, input: CreateHabit, today: string): Promise<HabitWithStats> {
    return this.repository.create(accountId, input, today);
  }

  async update(accountId: string, id: string, input: UpdateHabit, today: string): Promise<HabitWithStats> {
    const updated = await this.repository.update(accountId, id, input, today);
    if (!updated) throw new HabitNotFoundError();
    return updated;
  }

  async toggleLog(accountId: string, habitId: string, input: ToggleHabitLog): Promise<HabitLog> {
    const log = await this.repository.toggleLog(accountId, habitId, input);
    if (!log) throw new HabitNotFoundError();
    return log;
  }

  async remove(accountId: string, id: string): Promise<void> {
    const deleted = await this.repository.remove(accountId, id);
    if (!deleted) throw new HabitNotFoundError();
  }
}
