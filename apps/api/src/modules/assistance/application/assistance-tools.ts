import type { AssistanceContextSnapshot, AssistanceToolName } from '@pyneath/contracts';
export interface AssistanceToolSession {
  names: AssistanceToolName[];
  read(name: AssistanceToolName): Promise<unknown>;
}
export interface AssistanceContextAccess {
  load(accountId: string): Promise<AssistanceContextSnapshot>;
}
