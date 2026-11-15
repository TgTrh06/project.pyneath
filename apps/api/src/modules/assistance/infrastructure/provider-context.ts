import { assistanceToolNameSchema } from '@pyneath/contracts';
import type { AssistanceToolSession } from '../application/assistance-tools';

/** Materialize server-owned context before inference; the model never chooses what to read. */
export async function readProviderContext(tools: AssistanceToolSession | undefined, signal: AbortSignal) {
  if (!tools) return undefined; // Offline adapter evaluations may supply only a synthetic request.
  let abort!: () => void;
  const deadline = new Promise<never>((_, reject) => {
    abort = () => reject(new Error('Assistance deadline'));
    signal.addEventListener('abort', abort, { once: true });
  });
  const read = async () => {
    signal.throwIfAborted();
    if (tools.names.length > 2 || new Set(tools.names).size !== tools.names.length) throw new Error('Invalid context');
    const names = tools.names.map(name => assistanceToolNameSchema.parse(name));
    const context: Record<string, unknown> = {};
    for (const name of names) {
      signal.throwIfAborted();
      context[name] = await tools.read(name);
    }
    signal.throwIfAborted();
    if (Buffer.byteLength(JSON.stringify(context), 'utf8') > 8192) throw new Error('Context too large');
    return context;
  };
  try { return await Promise.race([read(), deadline]); }
  finally { signal.removeEventListener('abort', abort); }
}
