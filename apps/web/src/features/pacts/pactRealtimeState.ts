import type { FocusPact } from '@pyneath/contracts';

export function sessionToAutoJoin(pact: FocusPact, accountId: string, expectedSessionId?: string) {
  if (pact.status !== 'active' || !pact.sessionId || (expectedSessionId && pact.sessionId !== expectedSessionId)) return null;
  if (pact.creatorId === accountId || pact.participants.find(person => person.accountId === accountId)?.response !== 'accepted') return null;
  return pact.sessionId;
}
