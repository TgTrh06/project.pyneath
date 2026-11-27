import type { CreateHabit, HabitLog, HabitWithStats, ToggleHabitLog, UpdateHabit } from '@pyneath/contracts';

export const HABITS_ACCESS = Symbol('HABITS_ACCESS');

export interface HabitsAccess {
  list(accountId: string, today: string): Promise<HabitWithStats[]>;
  create(accountId: string, input: CreateHabit, today: string): Promise<HabitWithStats>;
  update(accountId: string, id: string, input: UpdateHabit, today: string): Promise<HabitWithStats>;
  toggleLog(accountId: string, habitId: string, input: ToggleHabitLog): Promise<HabitLog>;
  remove(accountId: string, id: string): Promise<void>;
}
