# hotel-crm

Offline-first hotel CRM for small properties.

## Workspace

- `apps/web`: mobile-first PWA client
- `apps/api`: Fastify backend
- `packages/shared`: shared domain types and contracts
- `docs`: architecture contract and prompt-chain outputs

## Prompt chain status

- Prompts `0-13`: completed in `/docs`
- Prompt `14`: scaffold initialized
- Prompt `15+`: module implementation starts from reservations/rooms foundations

## API persistence

The API now supports two persistence modes:

- default local JSON storage in `apps/api/data/hotel-data.json`
- PostgreSQL storage when `DATABASE_URL` is set or `HOTEL_CRM_STORAGE=postgres`

Useful commands:

- `npm run db:migrate -w apps/api`
- `npm run db:seed:json -w apps/api`

Example environment file: `apps/api/.env.example`
