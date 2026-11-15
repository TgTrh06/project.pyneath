import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pactChangedEventSchema, realtimeEvents } from '@pyneath/contracts';
import { PresenceGateway } from '../src/modules/presence/presentation/presence.gateway';
import type { PactChange } from '../src/modules/pact/application/pact.ports';

test('Pact realtime only emits the minimal event to authenticated recipient sockets', async () => {
  const received: Array<{ socket: string; event: string; payload: unknown }> = [];
  const gateway = new PresenceGateway({} as never, {} as never, {} as never, {} as never, {} as never);
  const recipients = new Set(['member-a', 'member-b']);
  const sockets = new Map<string, { id: string; connected: boolean; data: { account?: { id: string } }; emit: (event: string, payload: unknown) => void }>();
  for (const accountId of ['member-a', 'member-b', 'outsider']) {
    const id = `socket-${accountId}`;
    sockets.set(id, { id, connected: true, data: { account: { id: accountId } }, emit: (event, payload) => received.push({ socket: accountId, event, payload }) });
  }
  const instance = gateway as unknown as {
    sockets: Map<string, unknown>;
    authenticated(socket: { data: { account?: { id: string } } }): Promise<boolean>;
    publishPactChange(change: PactChange): Promise<void>;
  };
  instance.sockets = sockets;
  instance.authenticated = async socket => recipients.has(socket.data.account?.id ?? '');
  const change: PactChange = { accountIds: ['member-a', 'outsider'], pactId: 'b6b29372-60d2-45a9-bae3-8dc70e09930d', change: 'started', sessionId: '84a079d7-5628-4e2b-9c5e-3667d84f51dd' };

  await instance.publishPactChange(change);

  assert.deepEqual(received, [{ socket: 'member-a', event: realtimeEvents.pactChanged, payload: {
    pactId: change.pactId, change: 'started', sessionId: change.sessionId
  } }]);
  assert.equal(pactChangedEventSchema.safeParse(received[0].payload).success, true);
  assert.equal(pactChangedEventSchema.safeParse({ ...received[0].payload, accountIds: ['member-a'] }).success, false);
});
