# Manual Steps Codex Cannot Fully Complete

These are the pieces that still need a human owner, even with a strong generated codebase.

## 1. Provider accounts and contracts

You need real accounts, terms approval, billing, and sometimes commercial licences for:

- OpenAI or another LLM provider for structured recipe parsing
- Nutrition data vendors such as Nutritionix, Edamam, USDA, or equivalent
- Barcode data sources such as Open Food Facts or a commercial GS1-licensed source
- Push notification providers and mobile credentials
- Crash reporting and observability providers
- Cloud hosting accounts and DNS

## 2. Secrets and environment management

Generate and store these securely:

- JWT signing secrets
- database credentials
- Redis credentials
- provider API keys
- monitoring DSNs
- object storage credentials

For production, store them in a secret manager rather than in `.env` files.

## 3. Database and infrastructure provisioning

A human still needs to:

- provision Postgres with backups and retention
- provision Redis with persistence or managed failover if needed
- configure network access, firewalls, and private networking
- set up container registry and deployment permissions
- configure TLS, domain names, and certificates

## 4. Mobile push setup

The backend can queue reminders, but a human still needs to wire:

- Firebase Cloud Messaging configuration
- Apple Push Notification credentials
- app bundle identifiers and signing
- production push certificates / keys

## 5. Legal, privacy, and compliance work

Before launch, someone needs to supply:

- privacy policy
- terms of service
- cookie or analytics disclosure where relevant
- data retention policy
- GDPR/UK GDPR process
- deletion/export workflows validation

## 6. Nutrition data quality review

AI estimates should not ship unchecked. A nutrition or product owner should validate:

- branded food mappings
- portion sizes
- recipe serving sizes
- cultural meal coverage
- fallback assumptions for missing ingredients

## 7. Production readiness tasks

A human should verify:

- SLOs and alert thresholds
- dashboards and incident routing
- backup restore tests
- load test thresholds
- rate limit tuning
- moderation policy for community content
- abuse prevention rules
- premium paywall logic if subscriptions are added

## 8. App-store and device integration

Codex cannot submit builds, approve dashboards, or guarantee store-side settings. A human needs to:

- configure deep links
- verify auth callback URLs
- configure health/fitness integrations
- complete store listing assets and review answers
