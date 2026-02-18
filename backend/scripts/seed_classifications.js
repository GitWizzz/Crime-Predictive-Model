import fs from "fs";
import path from "path";
import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pkg;

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const pool = new Pool({ connectionString: databaseUrl });
const dataPath = path.join("scripts", "data", "classifications.json");
const raw = fs.readFileSync(dataPath, "utf-8");
const items = JSON.parse(raw);

const upsert = async (item) => {
  const query = `
    INSERT INTO crime_classifications (
      act_type, section_code, title, description, category, severity, is_women_safety, is_accident_related
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (act_type, section_code)
    DO UPDATE SET
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      category = EXCLUDED.category,
      severity = EXCLUDED.severity,
      is_women_safety = EXCLUDED.is_women_safety,
      is_accident_related = EXCLUDED.is_accident_related;
  `;
  const values = [
    item.act_type,
    item.section_code,
    item.title || null,
    item.description || null,
    item.category,
    item.severity ?? 1,
    item.is_women_safety ?? false,
    item.is_accident_related ?? false,
  ];
  await pool.query(query, values);
};

const run = async () => {
  try {
    console.log(`Seeding ${items.length} classification rows...`);
    for (const item of items) {
      await upsert(item);
    }
    console.log("Classification seed complete.");
  } catch (error) {
    console.error("Seed failed", error);
  } finally {
    await pool.end();
  }
};

run();
