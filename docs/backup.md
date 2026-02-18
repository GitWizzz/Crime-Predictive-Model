# Backup Strategy (PostgreSQL/PostGIS)

## Daily Logical Backup

```bash
pg_dump -Fc -f backup/crime_db_$(date +%F).dump crime_db
```

## Restore

```bash
pg_restore -d crime_db backup/crime_db_YYYY-MM-DD.dump
```

## Recommendations
- Store backups in cloud object storage (S3/GCS/Azure).
- Enable WAL archiving for point-in-time recovery.
- Test restore quarterly.
