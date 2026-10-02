# Worko 2.0

An on-demand workforce platform with requirement-based worker matching and a separate short-form discovery feed.

## Architecture

- Mobile: React Native + TypeScript
- Backend: NestJS + TypeScript
- Database: PostgreSQL + Prisma
- Cache and queues: Redis + BullMQ
- API: REST + Socket.IO
- Shared contracts: TypeScript + Zod

## Project structure

- apps/api: Backend API
- apps/mobile: React Native application
- packages/contracts: Shared API contracts
- packages/validation: Shared validation schemas
- infrastructure: Docker and deployment configuration
- docs: Architecture and implementation documentation

## Business invariants

1. Clients cannot directly book named workers.
2. Requirements require verified payment before matching.
3. Matching uses 5 km, 10 km, and 25 km rounds.
4. A maximum of 20 distinct offers can be issued per requirement.
5. Only one worker can win an assignment.
6. Wallet transactions must be atomic and idempotent.
7. All domain transitions are validated by the backend.

## Development

See the setup instructions in the project documentation.
