# NutriTrack Pro

Mobile-first calorie tracker with a React/Vite frontend and an Express backend. The app now starts with real sign-up and login, stores accounts and meal data, and has a one-command Windows workflow for workers.

## One-command start

From this folder:

```powershell
.\start-app.ps1
```

Or through npm:

THIS IS THE IMPORTANT RUN COMAND EDITED BY JR 
```powershell
npm run start:easy
```

The script checks Node.js, npm, required files, environment files, SQL Server presence, local data mode, ports, package installs, Prisma client compatibility, and then starts:

- Frontend: `http://localhost:8080`
- Backend: `http://localhost:4000`

## USDA food search

Live food search now uses USDA FoodData Central through the backend. Paste your key into this exact line:
````````````````````````````````````````````````````````````````````````|
                                                                        |
MAKE SURE THE API KEY IS HERE COPY AND PASTE IT I WILL SEND IT TO YOUS  |
```                                                                     |
env                                                                     |
USDA_API_KEY=YOUR_USDA_API_KEY_HERE  # PASTE YOUR USDA API KEY HERE     |
```                                                                     |
````````````````````````````````````````````````````````````````````````|
File:

THIS IS WERE YOU WILL FIND IT EDITED BY JR 
```text
backend\.env
```

Restart the app after changing the key. If the key is missing, saved starter foods still work, but live USDA search will show a clear setup message.

## Local database choice

The default worker setup uses `LOCAL_BACKEND_MODE=force_local`, which stores development data in:

```text
backend\.local-data\backend-store.json
```

This is intentional. It avoids SQL Server Express compatibility issues, Docker requirements, and fragile machine setup. PostgreSQL remains the production database path through `backend\prisma\schema.prisma` and `backend\docker-compose.yml`.

SQL Server Express is optional for now. Do not make every worker depend on it unless you decide to build a dedicated SQL Server adapter later.

## Useful commands

```powershell
npm run check:local
```

Checks the machine without starting the app.

```powershell
npm run dev
```

Starts only the frontend.

```powershell
npm run backend:dev
```

Starts only the backend.

```powershell
npm run backend:test
```

Runs backend tests.

```powershell
npm test
```

Runs frontend tests.

## Important folders

```text
src\pages          Main app screens
src\components     Reusable app and UI components
src\context        App state and authentication state
src\lib            API client and helpers
backend\src        Express API source
backend\prisma     Production PostgreSQL schema and seed file
backend\.local-data Local worker database file, created automatically
```

## Account flow

- `POST /api/v1/auth/register` creates an account.
- `POST /api/v1/auth/login` logs in.
- Passwords are hashed in the backend.
- JWT access and refresh tokens protect private routes.
- The frontend stores the session locally and clears it on logout.

## Production path

For production, use PostgreSQL and Redis instead of local file mode:

1. Set `LOCAL_BACKEND_MODE=database`.
2. Set a real `DATABASE_URL`.
3. Set a real `REDIS_URL`.
4. Replace local JWT secrets.
5. Run Prisma migrations.
6. Deploy the frontend and backend separately.
