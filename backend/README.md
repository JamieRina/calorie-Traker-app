# Calorie Tracker Backend Starter

A production-minded backend starter for a calorie tracker app that matches your uploaded brief: Node.js + Express, PostgreSQL, Redis, AI recipe parsing, reminders, analytics, offline sync support, favourites, workouts, and influencer/community surfaces.

## What this backend includes

- JWT auth with access tokens, refresh-token rotation, and logout support
- User profile updates with dietary preferences and calorie goal calculation
- Dedicated goals endpoints alongside the profile surface
- Food catalogue search, barcode lookup, favourites, and deduplicated recent foods
- Meal logging with automatic nutrition roll-ups
- Recipe creation and AI-assisted recipe parsing
- Progress tracking and dashboard analytics
- Reminder queue using BullMQ + Redis with delivery audit fields
- Offline mutation sync for idempotent `meal_log`, `progress_entry`, and `workout` creates
- Prisma schema for PostgreSQL
- Seed data for local development
- Example tests and worker process

## Project structure

```text
calorie-tracker-backend/
|-- prisma/
|   |-- schema.prisma
|   `-- seed.ts
|-- src/
|   |-- app.ts
|   |-- server.ts
|   |-- config/
|   |-- jobs/
|   |-- lib/
|   |-- middleware/
|   |-- modules/
|   |   |-- analytics/
|   |   |-- auth/
|   |   |-- community/
|   |   |-- foods/
|   |   |-- goals/
|   |   |-- meals/
|   |   |-- profile/
|   |   |-- progress/
|   |   |-- recipes/
|   |   |-- reminders/
|   |   |-- sync/
|   |   `-- workouts/
|   |-- routes/
|   `-- utils/
|-- tests/
|-- .env.example
|-- docker-compose.yml
`-- package.json
```

## Local run

### 1) Install dependencies

```bash
npm install
```

### 2) Start PostgreSQL and Redis

```bash
docker compose up -d
```

The default worker setup now uses file-backed local mode with `LOCAL_BACKEND_MODE=force_local` in `.env`. That lets `npm run dev` work without PostgreSQL, Redis, Docker, or SQL Server Express for day-to-day development.

### 3) Configure environment variables

```bash
cp .env.example .env
```

Then fill in the secrets and optional external API keys. For USDA live food search, paste your key here:

```env
USDA_API_KEY=YOUR_USDA_API_KEY_HERE  # PASTE YOUR USDA API KEY HERE
```

For local work, the backend now has sensible development defaults for PostgreSQL, Redis, JWT secrets, and common Vite frontend origins (`localhost:8080` and `localhost:8081`). Production still requires explicit non-default secrets and infrastructure URLs.

### 4) Run Prisma generate and migrations

```bash
npm run prisma:generate
npm run prisma:migrate
```

### 5) Seed development data

```bash
npm run db:seed
```

### 6) Start the API

```bash
npm run dev
```

### 7) Start the reminder worker in a second terminal

```bash
npm run worker:reminders
```

## Key endpoints

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/profile/me`
- `PATCH /api/v1/profile/me`
- `GET /api/v1/goals/current`
- `POST /api/v1/goals/calculate`
- `POST /api/v1/profile/goal`
- `GET /api/v1/foods/search?q=chicken`
- `GET /api/v1/foods/barcode/:barcode`
- `GET /api/v1/foods/usda/:fdcId`
- `POST /api/v1/foods/favourites`
- `GET /api/v1/foods/favourites`
- `GET /api/v1/foods/recent`
- `POST /api/v1/meals`
- `GET /api/v1/meals/daily?date=2026-04-02`
- `POST /api/v1/recipes/parse`
- `POST /api/v1/recipes`
- `GET /api/v1/analytics/dashboard?date=2026-04-02`
- `POST /api/v1/reminders`
- `GET /api/v1/reminders`
- `GET /api/v1/progress`
- `POST /api/v1/progress`
- `GET /api/v1/workouts`
- `POST /api/v1/workouts`
- `POST /api/v1/sync/mutations`
- `GET /api/v1/community/feed`
- `GET /health`
- `GET /health/deep`

## Notes on hardened behaviour

- Async route failures are forwarded into the central error middleware rather than bypassing it.
- Food search keeps working when Redis caching is unavailable.
- Favourites are deduplicated and validated before creation.
- Recent foods are returned without duplicates.
- Reminder jobs are scheduled with their timezone and write last-attempt audit fields.
- The sync endpoint retries failed mutations safely and reuses already-applied mutation IDs.

