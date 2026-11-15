import { describe, expect, it } from 'vitest';
import type { FocusPact } from '@pyneath/contracts';
import { sessionToAutoJoin } from './pactRealtimeState';

const active = {
  id: 'pact', campId: 'camp', creatorId: 'owner', startsAt: '2026-11-15T12:00:00.000Z', durationMinutes: 25,
  status: 'active', sessionId: 'session', createdAt: '2026-11-15T11:00:00.000Z',
  participants: [{ accountId: 'owner', response: 'accepted', displayName: 'Owner' }, { accountId: 'member', response: 'accepted', displayName: 'Member' }]
} as FocusPact;

describe('Pact realtime auto-join eligibility', () => {
  it('returns the Pact session only for a confirmed invitee and matching event', () => {
    expect(sessionToAutoJoin(active, 'member', 'session')).toBe('session');
  });
  it('does not auto-join the creator, a declined or pending invitee, or a stale session event', () => {
    expect(sessionToAutoJoin(active, 'owner', 'session')).toBeNull();
    expect(sessionToAutoJoin({ ...active, participants: active.participants.map(person => person.accountId === 'member' ? { ...person, response: 'declined' } : person) }, 'member')).toBeNull();
    expect(sessionToAutoJoin({ ...active, participants: active.participants.map(person => person.accountId === 'member' ? { ...person, response: 'invited' } : person) }, 'member')).toBeNull();
    expect(sessionToAutoJoin(active, 'member', 'another-session')).toBeNull();
  });
  it('does not auto-join a scheduled or terminal Pact', () => {
    expect(sessionToAutoJoin({ ...active, status: 'scheduled' }, 'member')).toBeNull();
    expect(sessionToAutoJoin({ ...active, status: 'cancelled' }, 'member')).toBeNull();
  });
});
