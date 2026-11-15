# 04 — Engineering

Target architecture is a NestJS modular monolith, PostgreSQL + Drizzle and a client-independent HTTP/realtime contract. Web validates the product first; React Native + Expo is the intended mobile client.

- [System Architecture](system-architecture.md)
- [System Diagrams](system-diagrams.md)
- [Data Model](data-model.md)
- [Data Dictionary](data-dictionary.md)
- [Module Delivery Plan](module-delivery-plan.md)
- [API Guidelines](api-guidelines.md)
- [Core State Machines](core-state-machines.md)
- [HTTP Contract](contracts/http-api.md)
- [Realtime Contract](contracts/realtime.md)
- [Event Catalog](event-catalog.md)
- [Web/Mobile API Strategy](web-mobile-api-strategy.md)
- [Sequence Diagrams](sequences/README.md)
- [ADR Index](adr/README.md)

Model training and assistance contracts are governed in [Pyneath Assistance and ML](../05-machine-learning/README.md).

`microservices-architecture.md` and `architecture-options.md` are retained as conditional architecture proposals; the current choice is the modular monolith described in [System Architecture](system-architecture.md). ADRs record decisions at the time they were made. Read the ADR index for superseded status before treating an old decision as current.

The API now follows the target module vocabulary. PostgreSQL-backed end-to-end tests remain opt-in and require an explicitly disposable database.
