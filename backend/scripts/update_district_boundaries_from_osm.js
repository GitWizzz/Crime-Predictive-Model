import dotenv from "dotenv";
import pkg from "pg";

dotenv.config();

const { Client } = pkg;

const client = new Client({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "crime_hotspot_db",
});

const districts = [
  { zoneName: "Patna", query: "Patna district, Bihar, India" },
  { zoneName: "Gaya", query: "Gaya district, Bihar, India" },
  { zoneName: "Muzaffarpur", query: "Muzaffarpur district, Bihar, India" },
  { zoneName: "Bhagalpur", query: "Bhagalpur district, Bihar, India" },
];

const fetchBoundary = async (query) => {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&polygon_geojson=1&limit=5&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "crime-predictive-model/1.0 (district-boundary-update)",
    },
  });
  if (!res.ok) {
    throw new Error(`Nominatim request failed (${res.status}) for "${query}"`);
  }
  const data = await res.json();
  if (!Array.isArray(data) || !data.length) {
    throw new Error(`No boundary found for "${query}"`);
  }

  const candidate = data.find((item) => item?.geojson?.type === "Polygon" || item?.geojson?.type === "MultiPolygon");
  if (!candidate?.geojson) {
    throw new Error(`No polygon geometry in Nominatim response for "${query}"`);
  }
  return candidate.geojson;
};

const run = async () => {
  await client.connect();
  try {
    await client.query("BEGIN");
    for (const district of districts) {
      const geometry = await fetchBoundary(district.query);
      const update = await client.query(
        `UPDATE zones
         SET boundary = $1::jsonb
         WHERE type = 'DISTRICT' AND LOWER(name) = LOWER($2)
         RETURNING id, name`,
        [JSON.stringify(geometry), district.zoneName]
      );

      if (!update.rowCount) {
        throw new Error(`District "${district.zoneName}" not found in zones table`);
      }
      console.log(`Updated boundary for ${update.rows[0].name}`);
    }
    await client.query("COMMIT");
    console.log("District boundaries updated from OpenStreetMap.");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Boundary update failed:", error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
};

run();

