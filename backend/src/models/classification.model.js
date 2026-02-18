import { pool } from "../config/db.js";

export const listClassifications = async () => {
  const result = await pool.query(
    `SELECT id, act_type, section_code, title, description, category, severity,
            is_women_safety, is_accident_related, created_at
     FROM crime_classifications
     ORDER BY act_type, section_code`
  );
  return result.rows;
};

export const findClassification = async ({ act_type, section_code }) => {
  const result = await pool.query(
    `SELECT id, act_type, section_code, title, description, category, severity,
            is_women_safety, is_accident_related
     FROM crime_classifications
     WHERE act_type = $1 AND section_code = $2`,
    [act_type, section_code]
  );
  return result.rows[0];
};

export const createClassification = async (data) => {
  const result = await pool.query(
    `INSERT INTO crime_classifications
      (act_type, section_code, title, description, category, severity, is_women_safety, is_accident_related)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, act_type, section_code, title, description, category, severity,
               is_women_safety, is_accident_related`,
    [
      data.act_type,
      data.section_code,
      data.title || null,
      data.description || null,
      data.category,
      data.severity ?? 1,
      data.is_women_safety ?? false,
      data.is_accident_related ?? false,
    ]
  );
  return result.rows[0];
};
