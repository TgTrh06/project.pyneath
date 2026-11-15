import { Injectable } from '@nestjs/common';
import { request } from 'node:https';
import { Readable } from 'node:stream';

export type BeeknoeeTransportTiming = Partial<{
  dnsMs: number;
  tcpMs: number;
  tlsMs: number;
  responseHeadersMs: number;
  socketReused: boolean;
  connectionTimingAvailable: boolean;
}>;
export type BeeknoeeRequestOptions = RequestInit & { onTiming?: (timing: BeeknoeeTransportTiming) => void };

/** Fixed HTTPS destination; no redirects or automatic retries. Native IPv4 TLS
 * avoids this Windows development host's undici connection-selection timeout. */
@Injectable()
export class BeeknoeeHttpTransport {
  request(options: BeeknoeeRequestOptions): Promise<Response> {
    return new Promise((resolve, reject) => {
      const started = performance.now();
      const report = (timing: BeeknoeeTransportTiming) => options.onTiming?.(timing);
      const outgoing = request('https://platform.beeknoee.com/v1/chat/completions', {
        method: 'POST', family: 4, signal: options.signal ?? undefined,
        headers: Object.fromEntries(new Headers(options.headers)),
      }, incoming => {
        report({ responseHeadersMs: Math.round(performance.now() - started) });
        const headers = new Headers();
        for (const [name, value] of Object.entries(incoming.headers)) {
          if (Array.isArray(value)) value.forEach(item => headers.append(name, item));
          else if (value !== undefined) headers.set(name, value);
        }
        const status = incoming.statusCode ?? 502;
        if ([204, 205, 304].includes(status)) { incoming.resume(); resolve(new Response(null, { status, headers })); }
        else resolve(new Response(Readable.toWeb(incoming) as ReadableStream<Uint8Array>, { status, headers }));
      });
      outgoing.on('socket', socket => {
        if (outgoing.reusedSocket) { report({ socketReused: true, connectionTimingAvailable: false, dnsMs: 0, tcpMs: 0, tlsMs: 0 }); return; }
        report({ socketReused: false, connectionTimingAvailable: socket.connecting });
        if (!socket.connecting) return;
        const socketStarted = performance.now();
        let resolvedAt = socketStarted, connectedAt = socketStarted;
        socket.once('lookup', () => {
          resolvedAt = performance.now();
          report({ dnsMs: Math.round(resolvedAt - socketStarted) });
        });
        socket.once('connect', () => {
          connectedAt = performance.now();
          report({ tcpMs: Math.round(connectedAt - resolvedAt) });
        });
        socket.once('secureConnect', () => report({ tlsMs: Math.round(performance.now() - connectedAt) }));
      });
      outgoing.on('error', () => reject(new Error('Beeknoee transport unavailable')));
      outgoing.end(String(options.body ?? ''));
    });
  }
}
