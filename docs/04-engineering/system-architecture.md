# System Architecture

## Target

```text
Web validation client ─┐
                       ├── HTTP API + realtime gateway ── NestJS modular monolith ── PostgreSQL/Drizzle
React Native client ───┘                                      │
                                                              └── allowlisted analytics/logging
```

The backend owns authorization, durable session lifecycle, pact/invitation state and server timestamps. Realtime transports presence and session snapshots; it is not the only durable state store.

Assistance is implemented behind the API provider boundary. The recorded local demo selected Beeknoee; OpenRouter, Gemini, OpenAI and self-hosted local inference adapters also exist. The default provider remains disabled, so a provider being implemented does not mean it is selected or approved for production. Clients never call models directly. No broker, worker, public-room service or media service is part of the current architecture.
