import { mutation, request } from '../transport';
import type { CreatePlannerItem, PlannerItem, UpdatePlannerItem } from '@pyneath/contracts';

export const listPlannerItems = (from?: string, to?: string) => {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const query = params.toString();
  return request<{ items: PlannerItem[] }>(`/me/planner${query ? `?${query}` : ''}`);
};

export const createPlannerItem = (input: CreatePlannerItem) =>
  mutation<{ item: PlannerItem }>('/me/planner', 'POST', input);

export const updatePlannerItem = (id: string, input: UpdatePlannerItem) =>
  mutation<{ item: PlannerItem }>(`/me/planner/${id}`, 'PATCH', input);

export const deletePlannerItem = (id: string) =>
  mutation<void>(`/me/planner/${id}`, 'DELETE');
