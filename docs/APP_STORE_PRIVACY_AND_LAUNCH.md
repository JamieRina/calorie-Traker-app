# App Store Privacy And Launch Notes

## Data Collected

- Account data: email address, display name, password hash, hashed signup verification tokens, hashed password reset tokens.
- Profile data: date of birth or derived age, sex, height, current weight, target weight, activity level, timezone, locale, dietary preferences.
- Nutrition data: foods searched/imported, favourites, meal logs, calories, macros, fibre, meal times, notes.
- Progress data: weight, body fat percentage, mood, notes, recorded dates.
- Activity data: workouts, duration, calories burned, notes.
- Reminder data: reminder type, title, body, schedule, timezone, delivery metadata.
- Community/content data: public content viewed from backend endpoints. No per-user analytics SDK is installed in this repo.

## Data Linked To User

Account, profile, goals, meals, favourites, recipes created by the user, progress, workouts, reminders, refresh tokens, signup verification tokens, password reset tokens, and sync mutations are linked to the authenticated user ID.

## Third-Party SDKs And Services

- Open Food Facts API: barcode/product lookup.
- USDA FoodData Central API: food search/detail lookup when configured.
- OpenAI API: optional recipe parsing when `OPENAI_API_KEY` is configured.
- SMTP provider: signup verification and password reset emails.
- Redis/BullMQ: backend queue infrastructure.

No ads SDK, analytics SDK, crash reporting SDK, or payment SDK is currently present in the repository.

## App Store Nutrition Label Draft

- Contact Info: Email Address, linked to user, used for app functionality/account management.
- Health and Fitness: nutrition, calorie, macro, weight, body metrics, workout data, linked to user, used for app functionality.
- User Content: meal notes, progress notes, recipe/source text, reminder text, linked to user, used for app functionality.
- Identifiers: internal user ID and auth/session tokens, linked to user, used for app functionality/security.
- Diagnostics/Usage Data: not collected by a client SDK in this repo. Server logs collect request method/path/status/duration without request bodies, passwords, tokens, meal contents, or query strings.

## Manual Launch Actions

- Add a public privacy policy URL to App Store Connect and the native/in-app settings surface.
- Create a dedicated App Review demo account in production and store credentials securely outside the repo.
- Configure production SMTP before enabling signup verification and password reset in production.
- Verify the signup OTP flow, resend cooldown, login after verification, and password reset with the production frontend URL.
- Configure production PostgreSQL, Redis, HTTPS frontend/backend origins, and strong JWT secrets.
- Package the web app in an approved native iOS project or add the missing native mobile stack before App Store submission.
