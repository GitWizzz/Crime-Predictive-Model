import dotenv from "dotenv";
import bcrypt from "bcrypt";
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
  {
    name: "Patna",
    minLat: 25.48,
    minLon: 85.0,
    maxLat: 25.78,
    maxLon: 85.32,
  },
  {
    name: "Gaya",
    minLat: 24.64,
    minLon: 84.86,
    maxLat: 24.98,
    maxLon: 85.23,
  },
  {
    name: "Muzaffarpur",
    minLat: 26.02,
    minLon: 85.16,
    maxLat: 26.33,
    maxLon: 85.53,
  },
  {
    name: "Bhagalpur",
    minLat: 25.08,
    minLon: 86.84,
    maxLat: 25.42,
    maxLon: 87.23,
  },
];

const stations = [
  { name: "Kotwali PS", district: "Patna", lat: 25.61, lon: 85.14 },
  { name: "Kankarbagh PS", district: "Patna", lat: 25.6, lon: 85.16 },
  { name: "Civil Lines PS", district: "Gaya", lat: 24.79, lon: 85.0 },
  { name: "Delha PS", district: "Gaya", lat: 24.76, lon: 84.99 },
  { name: "Town PS", district: "Muzaffarpur", lat: 26.12, lon: 85.38 },
  { name: "Kazi Mohammadpur PS", district: "Muzaffarpur", lat: 26.13, lon: 85.36 },
  { name: "Nathnagar PS", district: "Bhagalpur", lat: 25.24, lon: 87.01 },
  { name: "Ishakchak PS", district: "Bhagalpur", lat: 25.25, lon: 86.99 },
];

const classifications = [
  ["IPC", "379", "Theft", "Property Crime", 2, false, false],
  ["IPC", "392", "Robbery", "Violent Crime", 4, false, false],
  ["IPC", "354", "Assault on Woman", "WomenSafety", 4, true, false],
  ["NDPS", "21", "Narcotics Possession", "Narcotics", 3, false, false],
  ["IPC", "279", "Rash Driving", "Traffic", 2, false, true],
];

const rand = (min, max) => Math.random() * (max - min) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const asPolygonGeometry = ({ minLat, minLon, maxLat, maxLon }) => ({
  type: "Polygon",
  coordinates: [[
    [minLon, minLat],
    [maxLon, minLat],
    [maxLon, maxLat],
    [minLon, maxLat],
    [minLon, minLat],
  ]],
});

const main = async () => {
  await client.connect();
  try {
    await client.query("BEGIN");

    const adminPass = await bcrypt.hash("admin123", 10);
    const officerPass = await bcrypt.hash("officer123", 10);
    const analystPass = await bcrypt.hash("analyst123", 10);

    await client.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES
       ('Admin User', 'admin@crime.local', $1, 'ADMIN'),
       ('Officer User', 'officer@crime.local', $2, 'OFFICER'),
       ('Analyst User', 'analyst@crime.local', $3, 'ANALYST')
       ON CONFLICT (email) DO NOTHING`,
      [adminPass, officerPass, analystPass]
    );

    for (const row of classifications) {
      await client.query(
        `INSERT INTO crime_classifications
         (act_type, section_code, title, category, severity, is_women_safety, is_accident_related)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (act_type, section_code) DO NOTHING`,
        row
      );
    }

    for (const d of districts) {
      await client.query(
        `INSERT INTO zones (name, type, boundary)
         VALUES ($1, 'DISTRICT', $2::jsonb)
         ON CONFLICT (name, type) DO UPDATE SET boundary = EXCLUDED.boundary`,
        [d.name, JSON.stringify(asPolygonGeometry(d))]
      );
    }

    for (const s of stations) {
      const boundary = asPolygonGeometry({
        minLat: s.lat - 0.03,
        minLon: s.lon - 0.03,
        maxLat: s.lat + 0.03,
        maxLon: s.lon + 0.03,
      });
      await client.query(
        `INSERT INTO zones (name, type, boundary)
         VALUES ($1, 'STATION', $2::jsonb)
         ON CONFLICT (name, type) DO UPDATE SET boundary = EXCLUDED.boundary`,
        [s.name, JSON.stringify(boundary)]
      );
    }

    const clsRows = await client.query(
      "SELECT id, act_type, section_code, category, severity FROM crime_classifications"
    );
    const cls = clsRows.rows;

    const firCountRes = await client.query("SELECT COUNT(*)::int AS c FROM firs");
    const existingFirCount = firCountRes.rows[0].c;
    const targetFirCount = 120;
    const toInsert = Math.max(0, targetFirCount - existingFirCount);

    for (let i = 0; i < toInsert; i++) {
      const station = pick(stations);
      const district = station.district;
      const c = pick(cls);
      const lat = rand(station.lat - 0.02, station.lat + 0.02);
      const lon = rand(station.lon - 0.02, station.lon + 0.02);
      const daysAgo = Math.floor(rand(0, 90));
      const dt = new Date();
      dt.setDate(dt.getDate() - daysAgo);
      dt.setHours(Math.floor(rand(0, 23)), Math.floor(rand(0, 59)), 0, 0);

      await client.query(
        `INSERT INTO firs
         (fir_no, crime_type, section, date_time, location, police_station, zone, status,
          act_type, section_code, severity, category, classification_id, victim_gender, victim_age)
         VALUES
         ($1, $2, $3, $4, $5::jsonb, $6, $7, 'PENDING',
          $8, $9, $10, $11, $12, $13, $14)
         ON CONFLICT (fir_no) DO NOTHING`,
        [
          `FIR-${String(i + 1).padStart(5, "0")}`,
          c.category,
          c.section_code,
          dt.toISOString(),
          JSON.stringify({
            type: "Point",
            coordinates: [lon, lat],
            latitude: lat,
            longitude: lon,
          }),
          station.name,
          district,
          c.act_type,
          c.section_code,
          c.severity,
          c.category,
          c.id,
          Math.random() > 0.5 ? "M" : "F",
          Math.floor(rand(18, 65)),
        ]
      );
    }

    for (let i = 1; i <= 25; i++) {
      const station = pick(stations);
      const district = station.district;
      const lat = rand(station.lat - 0.03, station.lat + 0.03);
      const lon = rand(station.lon - 0.03, station.lon + 0.03);
      const dt = new Date();
      dt.setDate(dt.getDate() - Math.floor(rand(0, 60)));
      await client.query(
        `INSERT INTO irad_accidents
         (accident_id, date_time, severity, location, road_name, district, description, source)
         VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, 'IRAD')
         ON CONFLICT (accident_id) DO NOTHING`,
        [
          `IRAD-${String(i).padStart(4, "0")}`,
          dt.toISOString(),
          Math.floor(rand(1, 5)),
          JSON.stringify({
            type: "Point",
            coordinates: [lon, lat],
            latitude: lat,
            longitude: lon,
          }),
          `${district} Main Road`,
          district,
          "Sample imported accident record",
        ]
      );
    }

    const adminRow = await client.query(
      "SELECT id FROM users WHERE email = 'admin@crime.local' LIMIT 1"
    );
    const adminId = adminRow.rows[0]?.id || null;

    await client.query(
      `INSERT INTO patrol_routes (name, created_by, status, risk_score, scheduled_for, notes)
       VALUES
       ('Morning High-Risk Sweep', $1, 'PLANNED', 78.5, NOW() + INTERVAL '1 day', 'Demo route'),
       ('Night Sensitive Areas Patrol', $1, 'PLANNED', 84.2, NOW() + INTERVAL '2 day', 'Demo route')
       ON CONFLICT DO NOTHING`,
      [adminId]
    );

    const routeRows = await client.query(
      "SELECT id, name FROM patrol_routes ORDER BY id DESC LIMIT 2"
    );
    for (const route of routeRows.rows) {
      let seq = 1;
      for (const s of stations.slice(0, 4)) {
        await client.query(
          `INSERT INTO patrol_route_stops (route_id, sequence, latitude, longitude, zone_name, crime_count)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT DO NOTHING`,
          [route.id, seq++, s.lat, s.lon, s.name, Math.floor(rand(5, 30))]
        );
      }
    }

    await client.query("COMMIT");

    const counts = await client.query(`
      SELECT 'users' AS table_name, COUNT(*)::int AS count FROM users
      UNION ALL SELECT 'crime_classifications', COUNT(*)::int FROM crime_classifications
      UNION ALL SELECT 'zones', COUNT(*)::int FROM zones
      UNION ALL SELECT 'firs', COUNT(*)::int FROM firs
      UNION ALL SELECT 'irad_accidents', COUNT(*)::int FROM irad_accidents
      UNION ALL SELECT 'patrol_routes', COUNT(*)::int FROM patrol_routes
      UNION ALL SELECT 'patrol_route_stops', COUNT(*)::int FROM patrol_route_stops
      ORDER BY table_name;
    `);

    console.table(counts.rows);
    console.log("Demo data seeded.");
    console.log("Login users:");
    console.log("  admin@crime.local / admin123");
    console.log("  officer@crime.local / officer123");
    console.log("  analyst@crime.local / analyst123");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Seeding failed:", error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
};

main();
