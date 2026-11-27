import { mutation, request } from '../transport';
import type { CreateHabit, HabitLog, HabitWithStats, ToggleHabitLog, UpdateHabit } from '@pyneath/contracts';

export const listHabits = (today: string) =>
  request<{ habits: HabitWithStats[] }>(`/me/habits?today=${encodeURIComponent(today)}`);

export const createHabit = (input: CreateHabit, today: string) =>
  mutation<{ habit: HabitWithStats }>(`/me/habits?today=${encodeURIComponent(today)}`, 'POST', input);

export const updateHabit = (id: string, input: UpdateHabit, today: string) =>
  mutation<{ habit: HabitWithStats }>(`/me/habits/${id}?today=${encodeURIComponent(today)}`, 'PATCH', input);

export const toggleHabitLog = (habitId: string, input: ToggleHabitLog) =>
  mutation<{ log: HabitLog }>(`/me/habits/${habitId}/logs`, 'PUT', input);

export const deleteHabit = (id: string) =>
  mutation<void>(`/me/habits/${id}`, 'DELETE');
