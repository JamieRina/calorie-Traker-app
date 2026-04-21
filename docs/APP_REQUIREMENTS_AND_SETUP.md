# NutriTrack Pro Product And Setup Blueprint

## 1. Analyse User Needs and Project Goals

- Target audience: beginners, weight-loss users, athletes, busy professionals, and general health-conscious users who want fast daily logging.
- Main user problems: slow food entry, unclear calorie targets, confusing macros, low motivation, and poor visibility of trends.
- Behavioural barriers: decision fatigue, guilt after missed days, inaccurate portions, and logging drop-off after the first week.
- Redesign goals: make the first screen useful, keep logging to a few taps, use calm visual hierarchy, and protect the app behind real accounts.
- Workflow goals: one command, minimal dependencies, clear folder names, predictable local data, and no hard dependency on SQL Server Express.

## 2. Core Problems the App and Workflow Should Solve

- Slow food logging: recent foods, favourites, quick meal type selection, and one-tap logging.
- Confusing macro tracking: simple dashboard by default, advanced macro detail only when enabled.
- Homemade/cultural meals: recipe parsing service and custom food import path.
- Weak trends: progress and weekly calorie charts.
- Offline/local resilience: local fallback backend stores data in `backend\.local-data`.
- Worker onboarding pain: `start-app.ps1` checks tools, env files, ports, packages, and compatibility before running.

## 3. Propose a Full Feature Set

- Accounts and authentication: sign up, login, logout, hashed passwords, JWT tokens, protected app routes.
- Profile and onboarding: age, height, current weight, target weight, activity level, and goal type.
- Daily dashboard: calories remaining, meals, workouts, and macro summary.
- Meal logging: search, quick picks, recent foods, favourites, custom imports, and meal deletion.
- Food search and barcode support: USDA FoodData Central live search plus Open Food Facts barcode fallback.
- Exercise logging: preset workout entries and burned calories.
- Progress tracking: weight entries, weekly calories, and trend charts.
- AI nutrition analysis: recipe parsing service for natural language ingredient input.
- Influencer/community: challenge and coach content endpoint plus starter community screen.
- Developer workflow: health checks, local data mode, Prisma schema, seed data, and one-command runner.

## 4. Design the Full User Experience

- First launch: user lands on login/sign-up, not a marketing screen.
- Sign-up: email, password, display name, basic body metrics, activity level, and goal type.
- Returning user: dashboard opens directly when a stored session exists.
- Daily logging: tap `Log`, choose meal, search or pick recent/favourite, adjust serving, save.
- Barcode path: backend has barcode lookup route; scanner UI can be added with the same food result shape.
- Progress: charts show trend without overwhelming users.
- Community: coach-led content is separate from the daily log so the core workflow stays fast.

## 5. UI Mockups or Detailed Screen Descriptions

- Auth screen: logo, login/sign-up switch, account form, secure state, backend status warning.
- Home dashboard: date switcher, calories left, calorie ring, consumed/burned/meals metrics, meals list.
- Add meal: meal selector, search, recent/favourites/starter foods, quick add, portion drawer.
- Activity: workout presets, today burn, recent workouts.
- Progress: current weight, goal, weight chart, weekly calorie chart.
- Settings: simple/advanced mode, backend status, account summary, logout.
- Community: featured coach content and weekly challenges.

## 6. Define the Design System

- Colour: health green primary, blue accent, neutral backgrounds, restrained warning/error states.
- Typography: Instrument Sans for interface text, Space Grotesk for display labels with zero letter spacing.
- Components: rounded but tighter cards, icon buttons, segmented controls, metric cards, forms, charts, and empty states.
- Accessibility: clear labels, strong contrast, keyboard-friendly forms, visible disabled states, and readable text sizes.

## 7. Behavioural and Psychological Design

- Positive habit loops: small wins, meal count, progress visibility, and optional streak/challenge content.
- Reduced shame: missed logs are recoverable; the dashboard focuses on today.
- Less overwhelm: simple mode hides advanced details until the user asks for them.
- Re-entry: users can log the next meal quickly without repairing previous days first.

## 8. Differentiate the Product

- Standout feature: coach-led fast logging plus AI recipe support.
- Why it matters: users often fail because logging feels like admin; this combines structure, social motivation, and shortcut-heavy logging.
- Fit: community is present but does not crowd the primary calorie workflow.

## 9. High-Level System Architecture

```text
React/Vite mobile-first app
  -> API client with stored JWT session
  -> Express API modules
      auth, profile, goals, foods, meals, recipes, analytics,
      progress, workouts, reminders, sync, community
  -> Local worker data store by default
  -> PostgreSQL + Redis for production/database mode
  -> Optional Open Food Facts, AI provider, push notifications
```

Local development differs from production by using `LOCAL_BACKEND_MODE=force_local`, avoiding Docker, PostgreSQL, Redis, and SQL Server for worker machines.

## 10. Technology Choices and Justification

- React/Vite is retained because this repo is already a working web/mobile-first app.
- Node.js and Express are kept for a simple, understandable API.
- Prisma/PostgreSQL remains the production schema path.
- Redis is optional locally and useful in production for reminders, queues, and caching.
- REST is chosen over GraphQL because the app has clear resource flows and the team setup should stay simple.
- SQL Server Express is not the default because it adds machine-specific setup and driver compatibility risk.

## 11. Database Schema Design and Local Database Strategy

- Production schema includes users, profiles, goals, preferences, foods, branded foods, nutrition facts, recipes, meal logs, favourites, workouts, progress entries, reminders, challenges, badges, influencer content, and sync mutations.
- Local worker strategy: file-backed data store at `backend\.local-data\backend-store.json`.
- Production strategy: PostgreSQL using `backend\prisma\schema.prisma`.
- Optional SQL Server path: add a separate adapter later if the team standardises on SQL Server.
- Compatibility is checked by `start-app.ps1`: runtimes, env files, ports, package installs, Prisma generation, and optional SQL Server detection.

## 12. API Design

- Auth: `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`.
- Profile: `GET /profile/me`, `PATCH /profile/me`, `POST /profile/goal`.
- Foods: search, import, favourites, recent foods, barcode lookup.
- Meals: create, daily listing, delete.
- Recipes: create and parse recipe text.
- Progress/workouts: list and create entries.
- Analytics: dashboard summary by date.
- Community: feed with featured content and challenges.
- Health: `/health` and `/health/deep`.

## 13. Backend Architecture and Authentication System

- Auth module hashes passwords with bcrypt and issues JWT access/refresh tokens.
- Protected routes use `requireAuth`.
- Validation uses Zod schemas.
- Local fallback keeps auth, profile, foods, meals, workouts, progress, and analytics usable without database infrastructure.
- Production mode uses Prisma and PostgreSQL.

## 14. AI-Powered Nutrition Analysis

- Recipe parser accepts natural language recipe text.
- It extracts ingredients, normalises units, estimates grams, calculates nutrition, and stores recipes.
- Low-confidence estimates should be shown for manual correction before saving.
- Fallback path uses rule-based parsing and existing food data when no AI key is configured.

## 15. Offline Support, Sync, and Local Resilience

- Frontend stores session locally.
- Backend local mode keeps data available without PostgreSQL/Redis.
- Sync mutation schema supports idempotent offline changes.
- Conflict strategy: client mutation IDs prevent duplicate creates.
- User messaging: backend warnings appear on auth, dashboard, add meal, and settings screens.

## 16. Scalability, Performance, Security, and Minimal Dependency Policy

- Scale backend horizontally behind a load balancer.
- Use PostgreSQL replicas, indexes, Redis caching, queue workers, and CDN-hosted frontend assets.
- Secure defaults: password hashing, JWT secrets, protected routes, rate limiting, Helmet, CORS, validation.
- Starter dependencies are limited to existing React/Vite UI libraries and Express backend essentials.
- No SQL Server dependency is required for workers.

## 17. Error Handling, Edge Cases, and Compatibility Checker Logic

- Missing backend: auth screen blocks account actions and shows a clear warning.
- Invalid login: backend returns generic invalid login details.
- Missing food data: local starter foods remain searchable.
- Port conflict: `start-app.ps1` stops with a human-readable message for backend port conflicts.
- Package mismatch: Prisma generation runs before startup.
- SQL Server mismatch: detected as optional and not required.

## 18. Testing Strategy

- Unit tests: calorie goal logic, validation helpers, UI utility functions.
- API tests: auth, health, meals, foods, profile, and protected routes.
- Database tests: Prisma migrations and key relationship constraints in database mode.
- Local setup tests: `npm run check:local`.
- UI tests: auth render, login validation, dashboard protected state, add meal flow.
- Security tests: invalid JWTs, rate limits, weak passwords, and CORS.

## 19. Deployment, CI/CD, Monitoring, Logging, and One-Command Setup Workflow

- Local command: `.\start-app.ps1`.
- Check-only command: `npm run check:local`.
- Production: deploy frontend as static assets, backend as a Node service/container, PostgreSQL managed database, Redis managed cache.
- CI/CD: install, type-check, test, build, run migrations, deploy.
- Monitoring: structured logs, health checks, metrics, alerts, and crash reporting.

## 20. Third-Party APIs, Integrations, and Environment Configuration

- Nutrition/barcode: USDA FoodData Central for live food search; Open Food Facts remains as a barcode fallback.
- AI: configurable OpenAI-compatible recipe parser key.
- Push notifications: Firebase Cloud Messaging later for mobile builds.
- Analytics/crash reporting: privacy-conscious product analytics and Sentry-style crash logging later.
- Environment variables live in `.env` and `backend\.env`; examples are provided.

## 21. Future Improvements, Team Workflow, and Final Recommendation

- Roadmap: wearable integrations, coach mode, photo meal estimation, family accounts, multilingual food intelligence, premium plans, and enterprise wellness.
- Team workflow: clone repo, run `.\start-app.ps1`, branch from `main`, keep migrations reviewed, do not commit `.local-data`.
- Recommendation: default to local file mode for workers, PostgreSQL for production, SQL Server only if a deliberate adapter is built.

## 22. Generate the Full Codebase

The starter codebase is in the repo:

```text
src\pages\Auth.tsx
src\pages\Dashboard.tsx
src\pages\AddMeal.tsx
src\pages\Activity.tsx
src\pages\Progress.tsx
src\pages\Community.tsx
src\pages\Settings.tsx
src\context\AuthContext.tsx
src\context\AppContext.tsx
src\lib\api.ts
backend\src\modules\auth
backend\src\modules\profile
backend\src\modules\foods
backend\src\modules\meals
backend\src\modules\recipes
backend\src\modules\analytics
backend\src\modules\community
backend\prisma\schema.prisma
start-app.ps1
```

## 23. Explain How to Run the Project Locally and Paste-In App Requirements

New worker setup:

```powershell
git clone <repo-url>
cd calorie-Traker-app
.\start-app.ps1
```

Secondary commands:

```powershell
npm run check:local
npm run dev
npm run backend:dev
npm test
npm run backend:test
```

The app requirements from the XML prompt are incorporated as: real auth, functional persisted local data, low dependency local workflow, optional SQL Server, PostgreSQL production path, community/challenge starter, AI recipe backend module, offline/sync schema, and one-command setup.
