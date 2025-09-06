# Cosmic Events Explorer – Web

## Local development

1. Install dependencies

```bash
npm install
```

2. Setup database (SQLite) and seed

```bash
npm run db:migrate
npm run db:seed
```

3. Run the dev server

```bash
npm run dev
```

App runs at http://localhost:3000

## Environment

- DATABASE_URL is set to SQLite by default in `.env`:

```
DATABASE_URL="file:./dev.db"
```

## API routes

- GET `/api/events?from&to&type`
- GET `/api/events/next`
- GET `/api/stream` (SSE ping)
- POST `/api/subscriptions` (Web Push subscription payload)

## Notes

- Prisma Client is used via `src/lib/prisma.ts`.
- For production, switch to Postgres and update `datasource db` in `prisma/schema.prisma` and `.env`.
