import dotenv from "dotenv";
import pkg from "pg";

dotenv.config();

const { Client } = pkg;

const connectionString = process.env.DATABASE_URL;

const client = new Client({
  connectionString: connectionString || undefined,
  host: connectionString ? undefined : process.env.DB_HOST,
  port: connectionString ? undefined : Number(process.env.DB_PORT || 5432),
  user: connectionString ? undefined : process.env.DB_USER,
  password: connectionString ? undefined : process.env.DB_PASSWORD,
  database: connectionString ? undefined : process.env.DB_NAME,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
});

const convertZonesBoundary = async () => {
  const res = await client.query(`
    SELECT data_type, udt_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'zones'
      AND column_name = 'boundary'
    LIMIT 1;
  `);

  if (!res.rows.length) {
    return;
  }

  const { udt_name } = res.rows[0];
  if (udt_name === "geometry") {
    await client.query("ALTER TABLE zones ALTER COLUMN boundary TYPE geometry(MultiPolygon, 4326) USING ST_Multi(ST_SetSRID(boundary, 4326));");
    return;
  }

  await client.query("ALTER TABLE zones ADD COLUMN IF NOT EXISTS boundary_geom geometry(MultiPolygon, 4326);");
  await client.query(`
    UPDATE zones
    SET boundary_geom = ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(boundary::text), 4326))
    WHERE boundary IS NOT NULL
      AND jsonb_typeof(boundary) = 'object'
      AND (boundary ->> 'type') IS NOT NULL;
  `);
  await client.query("ALTER TABLE zones DROP COLUMN boundary;");
  await client.query("ALTER TABLE zones RENAME COLUMN boundary_geom TO boundary;");
  await client.query("ALTER TABLE zones ALTER COLUMN boundary SET NOT NULL;");
};

const convertPointColumnToGeography = async (table, column) => {
  const res = await client.query(
    `
      SELECT udt_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
        AND column_name = $2
      LIMIT 1;
    `,
    [table, column]
  );

  if (!res.rows.length) {
    return;
  }

  const { udt_name } = res.rows[0];
  if (udt_name === "geography") {
    return;
  }

  const tmpCol = `${column}_geo`;
  await client.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${tmpCol} geography(Point, 4326);`);
  await client.query(`
    UPDATE ${table}
    SET ${tmpCol} =
      CASE
        WHEN ${column} IS NULL THEN NULL
        WHEN jsonb_typeof(${column}) = 'object' AND (${column} ->> 'type') = 'Point'
          THEN ST_SetSRID(ST_GeomFromGeoJSON(${column}::text), 4326)::geography
        WHEN jsonb_typeof(${column}) = 'object' AND ${column} ? 'coordinates'
          THEN ST_SetSRID(
            ST_MakePoint(
              (${column} -> 'coordinates' ->> 0)::double precision,
              (${column} -> 'coordinates' ->> 1)::double precision
            ),
            4326
          )::geography
        WHEN jsonb_typeof(${column}) = 'object' AND ${column} ? 'longitude' AND ${column} ? 'latitude'
          THEN ST_SetSRID(
            ST_MakePoint(
              (${column} ->> 'longitude')::double precision,
              (${column} ->> 'latitude')::double precision
            ),
            4326
          )::geography
        WHEN jsonb_typeof(${column}) = 'object' AND ${column} ? 'lon' AND ${column} ? 'lat'
          THEN ST_SetSRID(
            ST_MakePoint(
              (${column} ->> 'lon')::double precision,
              (${column} ->> 'lat')::double precision
            ),
            4326
          )::geography
        ELSE NULL
      END
    WHERE ${column} IS NOT NULL;
  `);
  await client.query(`ALTER TABLE ${table} DROP COLUMN ${column};`);
  await client.query(`ALTER TABLE ${table} RENAME COLUMN ${tmpCol} TO ${column};`);
};

const createIndexes = async () => {
  await client.query("CREATE INDEX IF NOT EXISTS zones_boundary_gix ON zones USING gist(boundary);");
  await client.query("CREATE INDEX IF NOT EXISTS firs_location_gix ON firs USING gist(location);");
  await client.query("CREATE INDEX IF NOT EXISTS irad_accidents_location_gix ON irad_accidents USING gist(location);");
};

const ensurePostgisAvailable = async () => {
  const available = await client.query(
    "SELECT 1 FROM pg_available_extensions WHERE name = 'postgis' LIMIT 1;"
  );
  if (!available.rows.length) {
    throw new Error(
      "PostGIS binaries are not installed on this PostgreSQL server. Install PostGIS first, then rerun this script."
    );
  }
  await client.query('CREATE EXTENSION IF NOT EXISTS "postgis";');
};

const main = async () => {
  await client.connect();
  try {
    await client.query("BEGIN");
    await ensurePostgisAvailable();
    await convertZonesBoundary();
    await convertPointColumnToGeography("firs", "location");
    await convertPointColumnToGeography("irad_accidents", "location");
    await createIndexes();
    await client.query("COMMIT");
    console.log("Spatial columns converted to PostGIS types successfully.");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Spatial conversion failed:", error.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
};

main();
