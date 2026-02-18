# Production Readiness Roadmap

Project: Crime Predictive Model / Hotspot Mapping
Start date: 2026-02-17
Target date: 2026-05-05
Deployment target: Cloud environment
Definition of production ready: The application works properly end-to-end for intended users, is secure, stable, observable, and deployable.

## Success Criteria (Definition of Done)
- End-to-end flow works: login, FIR CRUD, hotspot analysis, ML endpoints, map visualization.
- No critical security gaps: protected routes, strong role enforcement, input validation, rate limiting, and safe config handling.
- Stable deployment: backend, ML service, and database run reliably in cloud.
- Observability: logs, health checks, and basic monitoring exist.
- Data integrity: migrations and database schema are versioned.
- Performance: pagination, spatial indexes, and acceptable response times for common queries.

## Phase Plan (2026-02-17 to 2026-05-05)

Phase 1 - Stabilization and Hygiene (Feb 17 to Mar 02)
- Create database migration workflow and move schema creation into migrations.
- Add request validation for all API routes.
- Add consistent API error format across controllers.
- Add pagination to FIR listing and report endpoints.
- Document all required environment variables in README.

Phase 2 - Security and Access Control (Mar 03 to Mar 16)
- Restrict signup (admin-only or invitation code).
- Enforce strict RBAC on all routes.
- Add CORS configuration, helmet, and rate limiting.
- Add password policy and account lockout on repeated failed logins.
- Add audit logging table and write audit events on auth and FIR changes.

Phase 3 - Scalability and Performance (Mar 17 to Mar 30)
- Add spatial indexes (GIST) and standard indexes on query columns.
- Add caching for hotspot results and risk scores.
- Precompute hotspot clusters daily or on schedule.
- Add background job runner for ML batch tasks.

Phase 4 - Observability and Reliability (Mar 31 to Apr 13)
- Add structured logging with request ID.
- Extend /api/health to include ML and DB checks.
- Add basic alerting thresholds (errors, latency).
- Add error reporting (Sentry or equivalent).

Phase 5 - Deployment and CI/CD (Apr 14 to Apr 27)
- Create Dockerfiles for backend and ML service.
- Create docker-compose for local and cloud testing.
- Add CI pipeline for lint, test, build.
- Create cloud deployment plan (Render/Vercel/Cloud Run/EC2).

Phase 6 - Final Hardening and Demo (Apr 28 to May 05)
- Load test core endpoints.
- Validate failover and restart behavior.
- Run end-to-end demo checklist.
- Freeze features, fix bugs, and finalize documentation.

## Cloud Deployment Options
- Render: easiest for backend + ML + Postgres, with managed services.
- Vercel: best for frontend hosting, pair with Render or AWS for backend/ML.
- AWS/GCP: most flexible, more operational overhead.

## Immediate Next Actions
- Approve migration tooling choice (node-pg-migrate or Prisma).
- Decide hosting stack (Render + Vercel is recommended for this scope).
- Confirm which endpoints must be included in the first production demo.

## Risks to Watch
- ML service performance on large datasets without batching.
- Missing spatial indexes causing slow map queries.
- Security gaps from open signup and lack of rate limiting.

## Owners and Tracking
- Track tasks in docs/PROJECT_GUIDELINES.md under the Team Sync Panel.
- Add each completed item with date and status.