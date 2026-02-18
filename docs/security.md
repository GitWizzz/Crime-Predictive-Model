# Security Checklist

## Implemented
- JWT authentication
- Role-based access (Admin/Officer/Analyst)
- Rate limiting
- Audit logs
- Input validation (Zod)
- HTTPS-ready config (DB_SSL + reverse proxy)

## Recommended for Production
- Use HTTPS everywhere (TLS termination).
- Store secrets in a managed vault.
- Enable DB encryption at rest (managed Postgres).
- Rotate JWT secrets periodically.
- Monitor access logs + alerts.
