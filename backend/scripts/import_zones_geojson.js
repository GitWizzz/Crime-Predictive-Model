import fs from "fs";
import path from "path";
import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pkg;

const args = process.argv.slice(2);
const getArg = (key, def) => {
  const idx = args.indexOf(key);
  if (idx === -1 || idx + 1 >= args.length) return def;
  return args[idx + 1];
};

const filePath = getArg("--file", path.join("frontend", "public", "geo", "bihar_districts.geojson"));
const type = getArg("--type", "DISTRICT");
const nameKey = getArg("--nameKey", "district");

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const pool = new Pool({ connectionString: databaseUrl });

const raw = fs.readFileSync(filePath, "utf-8");
const geojson = JSON.parse(raw);
const features = geojson.features || [];

const insertZone = async (feature) => {
  const props = feature.properties || {};
  const name = props[nameKey] || props.name || props.NAME || props.district || "Unknown";
  const geometry = feature.geometry;

  const query = `
    INSERT INTO zones (name, type, boundary)
    VALUES ($1, $2, ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON($3), 4326)))
    ON CONFLICT (name, type) DO UPDATE SET boundary = EXCLUDED.boundary
    RETURNING id;
  `;

  await pool.query(query, [name, type, JSON.stringify(geometry)]);
};

const run = async () => {
  try {
    console.log(`Importing ${features.length} zones from ${filePath}`);
    for (const feature of features) {
      await insertZone(feature);
    }
    console.log("Import completed.");
  } catch (error) {
    console.error("Import failed", error);
  } finally {
    await pool.end();
  }
};

run();