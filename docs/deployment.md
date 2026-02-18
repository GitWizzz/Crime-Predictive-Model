# Deployment Guide

## One-Command Local/Cloud Deploy (Docker Compose)

```bash
docker compose up -d --build
```

Services:
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:4000`
- ML Service: `http://localhost:8001`
- PostGIS: `localhost:5432`

## Migration & Seed

```bash
cd backend
npm run migrate:up
node scripts/seed_classifications.js
```

## Production Notes

- Set `NODE_ENV=production`
- Use `DB_SSL=true` for managed Postgres.
- Provide strong `JWT_SECRET`.
- Configure reverse proxy (Nginx/Traefik) with TLS.

## Health Check

```
GET /api/health
```

Expected JSON response:
```
{ "success": true, "message": "Backend healthy", "data": { ... } }
```
