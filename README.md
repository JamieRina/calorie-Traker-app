# BiteBalance

BiteBalance is a mobile-first calorie and nutrition tracking app. Users can create an account with email-code verification, set a profile and goal, log and edit meals, search foods, save favourites, track workouts, view progress charts, reset passwords by email, and delete their account.

The frontend is React 18, Vite, TypeScript, React Router, TanStack Query, Tailwind CSS, Recharts, Framer Motion, Sonner, Radix UI, and Lucide icons. The backend is Node.js, Express, TypeScript, Prisma, PostgreSQL, Redis/BullMQ, Zod, bcrypt, JWT, Nodemailer, Open Food Facts, USDA FoodData Central, and optional OpenAI recipe parsing.

This repository does not include Capacitor, Expo, React Native, Xcode, or native iOS project files. TestFlight and App Store submission require a native wrapper/project or another approved packaging path.

## Project Structure

- `src/`: React app, screens, shared UI components, contexts, API client, and frontend tests.
- `src/pages/`: app screens for auth, dashboard, food logging, activity, progress, community guidance, settings, and 404 handling.
- `src/context/`: auth/session state and app-wide settings such as date, theme, mode, backend health, and starter food data.
- `src/lib/`: API client, local session/manual-food helpers, and utility functions.
- `public/`: static logo, robots file, and privacy policy page.
- `backend/src/`: Express API, config, middleware, modules, worker, scripts, local development fallback, and shared utilities.
- `backend/src/modules/auth/`: signup, 2-step email OTP verification, login, refresh, logout, password reset, account deletion, cookies, validators, and service logic.
- `backend/src/modules/*`: profile, goals, foods, meals, analytics, progress, workouts, reminders, recipes, sync, and community endpoints.
- `backend/prisma/`: PostgreSQL schema, migration, and seed script.
- `docs/APP_STORE_PRIVACY_AND_LAUNCH.md`: App Store privacy label and launch notes.

## Requirements

- Node.js `20.19.0` or newer.
- npm, using the checked-in `package-lock.json` files.
- PostgreSQL for production.
- Redis for reminders, queues, and production cache behavior.
- SMTP provider for signup verification and password reset email.
- Optional: Docker Desktop for local PostgreSQL/Redis through `backend/docker-compose.yml`.
- Optional: USDA FoodData Central API key and OpenAI API key.
- App Store submission: native iOS project/wrapper, App Store Connect metadata, support URL, privacy policy URL, and reviewer demo account.

## Environment Setup

Create frontend env values from `.env.example`:

```powershell
Copy-Item .env.example .env
```

Frontend variables:

- `VITE_API_BASE_URL`: public API base URL, for example `http://localhost:4000/api/v1` locally or an HTTPS production URL.
- `VITE_PRIVACY_POLICY_URL`: public privacy policy URL. `/privacy.html` works for local web builds.

Create backend env values from `backend/.env.example`:

```powershell
Copy-Item backend\.env.example backend\.env
```

Backend variables:

- `NODE_ENV` and `APP_ENV`: `development`, `staging`, or `production`.
- `PORT`: backend HTTP port.
- `APP_ORIGIN`: comma-separated allowed frontend origins. Production values must be HTTPS.
- `LOCAL_BACKEND_MODE`: `force_local` for file-backed local development, `database` for production.
- `DATABASE_URL`: PostgreSQL connection string.
- `REDIS_URL`: Redis connection string.
- `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`: different random secrets, at least 32 characters in production.
- `JWT_ACCESS_TTL` and `JWT_REFRESH_TTL`: access and refresh token lifetimes.
- `AUTH_REFRESH_COOKIE_NAME` and `AUTH_COOKIE_DOMAIN`: refresh cookie settings.
- `PASSWORD_RESET_BASE_URL`: frontend URL used in password reset links.
- `PASSWORD_RESET_TTL_MINUTES`: reset token expiry.
- `OTP_EXPIRY_MINUTES`, `OTP_RESEND_COOLDOWN_SECONDS`, `OTP_MAX_RESENDS`, `OTP_MAX_VERIFY_ATTEMPTS`: signup email-code lifetime and abuse protection.
- `SMTP_PROVIDER`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_REQUIRE_TLS`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`: SMTP settings.
- `OPENAI_API_KEY` and `OPENAI_MODEL`: optional recipe parser integration.
- `USDA_API_KEY` and `USDA_BASE_URL`: optional USDA live food search.
- `OPEN_FOOD_FACTS_BASE_URL` and `OPEN_FOOD_FACTS_USER_AGENT`: barcode/product lookup.
- `REMINDER_QUEUE_NAME` and `LOG_LEVEL`: worker and logging settings.
- `SEED_DEMO_EMAIL` and `SEED_DEMO_PASSWORD`: optional seed script credentials only.

Never commit real `.env` files, API keys, SMTP passwords, database URLs, JWT secrets, or reviewer/demo credentials.

## Installation

```powershell
npm install
npm run backend:install
```

## Running Locally

One-command local startup:

```powershell
npm run start:easy
```

Check the local machine without starting servers:

```powershell
npm run check:local
```

Manual frontend and backend startup:

```powershell
npm run dev
npm run backend:dev
```

Default local URLs:

- Frontend: `http://localhost:8080`
- Backend health: `http://localhost:4000/health`
- Backend API: `http://localhost:4000/api/v1`

## Database Setup

Generate Prisma client:

```powershell
npm run backend:prisma:generate
```

Run development migrations:

```powershell
npm run backend:prisma:migrate
```

Deploy migrations in production:

```powershell
npm --prefix backend run prisma:deploy
```

Optional seed data:

```powershell
$env:SEED_DEMO_EMAIL="reviewer@example.com"
$env:SEED_DEMO_PASSWORD="replace-with-a-strong-temporary-password"
npm run backend:db:seed
```

Resetting local Docker database data requires stopping containers and removing the Docker volume manually. Do not reset production data.

## SMTP And Email

Signup verification codes and password reset emails are sent through Nodemailer. Supported provider presets are `custom`, `gmail`, `outlook`, `sendgrid`, `mailgun`, and `ses`. For production deliverability, verify the sender/domain and configure SPF, DKIM, and DMARC with the email provider.

Test SMTP after setting `backend/.env`:

```powershell
npm run backend:email:test -- --to=you@example.com
```

Common SMTP issues:

- Missing `SMTP_FROM`, `SMTP_USER`, or `SMTP_PASSWORD`.
- Wrong port/security combination. Use port `465` with secure SMTP, or port `587` with TLS.
- `PASSWORD_RESET_BASE_URL` pointing at localhost in production.
- Sender domain not verified with the provider.

To test signup verification locally, create an account from the app after SMTP is configured. In local file mode without SMTP, the backend stores development emails in memory for automated tests only and does not expose OTP codes through the frontend.

## Testing

Frontend tests:

```powershell
npm test
```

Backend tests:

```powershell
npm run backend:test
```

Linting and type checks:

```powershell
npm run lint
npm run typecheck
npm run backend:lint
```

Dependency audits:

```powershell
npm audit --audit-level=high
npm --prefix backend audit --audit-level=high
```

## Production Build

Frontend build:

```powershell
npm run build
```

Backend build:

```powershell
npm run backend:build
```

Backend container build:

```powershell
docker build -t bitebalance-backend ./backend
```

## Deployment Notes

Backend deployment:

1. Install dependencies with `npm --prefix backend ci`.
2. Set production environment variables in the host secret store.
3. Run `npm --prefix backend run prisma:generate`.
4. Run `npm --prefix backend run prisma:deploy`.
5. Run `npm --prefix backend run build`.
6. Start with `npm --prefix backend run start`.
7. Run `npm --prefix backend run worker:reminders` as a separate process if reminders are enabled.

Frontend deployment:

1. Set `VITE_API_BASE_URL` to the production HTTPS API URL before building.
2. Set `VITE_PRIVACY_POLICY_URL` to the public production privacy policy URL.
3. Run `npm run build`.
4. Deploy `dist/` to static hosting or package it in the native wrapper.

Production must use HTTPS origins, `LOCAL_BACKEND_MODE=database`, PostgreSQL, Redis, SMTP, strong JWT secrets, and no localhost URLs.

## App Store And TestFlight Notes

- Add a native iOS project/wrapper before TestFlight or App Store submission.
- Add a public privacy policy URL in App Store Connect and in the app settings/legal surface.
- Create a dedicated App Review demo account in production and store credentials outside the repo.
- Verify signup, email-code verification, login, logout, password reset, account deletion, meal logging/editing, profile/goal updates, privacy policy link, and fresh-install behavior against production services.
- Health, nutrition, calorie, weight, goals, profile, and account data are sensitive personal data. Do not add analytics or crash-reporting SDKs without updating privacy disclosures.

## Security Notes

- Passwords are hashed with bcrypt and never stored in plain text.
- Access tokens are short-lived JWTs. Refresh tokens are stored as hashes server-side and sent to browsers in httpOnly cookies.
- Protected routes verify the authenticated user server-side.
- User-owned meals, progress, workouts, reminders, recipes, goals, profile, favourites, sync mutations, password reset tokens, and refresh tokens are scoped by `userId`.
- Password reset tokens are random, hashed at rest, expire, and are consumed after use.
- Signup verification codes are random 6-digit OTPs, hashed at rest with the user id, expire quickly, and are protected by resend and verification-attempt limits.
- Production startup rejects unsafe defaults, localhost origins, local backend mode, weak JWT secrets, and missing SMTP/reset config.
- Logs must not include passwords, tokens, cookies, request bodies, or nutrition payloads.

## Troubleshooting

- Install errors: confirm Node.js `20.19.0+`, delete `node_modules`, then rerun `npm install` and `npm run backend:install`.
- Vite engine errors: update Node.js; Vite 7 requires Node `20.19.0+`.
- Backend port conflict: stop the process using port `4000` or change `PORT`.
- Frontend port conflict: Vite may choose another port; update `APP_ORIGIN` if needed.
- Database errors: confirm `DATABASE_URL`, PostgreSQL availability, and migrations.
- Redis errors: confirm `REDIS_URL` and Redis availability before enabling reminders.
- SMTP errors: verify provider, sender, TLS/port, credentials, and domain authentication.
- Auth errors: confirm `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `APP_ORIGIN`, cookie domain, and HTTPS settings.
- Build errors: run `npm run typecheck`, `npm run backend:lint`, and reinstall from lockfiles.
