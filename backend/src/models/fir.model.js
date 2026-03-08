import { pool } from "../config/db.js";
import { env } from "../utils/env.js";
import { getSpatialCapabilities } from "../utils/spatial.util.js";

export const createFIR = async ({
    fir_no,
    crime_type,
    section,
    act_type,
    section_code,
    severity,
    category,
    classification_id,
    victim_gender,
    victim_age,
    sensitive_notes,
    date_time,
    latitude,
    longitude,
    police_station,
    zone,
}) => {
    const capabilities = await getSpatialCapabilities();
    const usePostgis = capabilities.firLocationSpatial;
    const locationExpr = usePostgis
        ? "ST_SetSRID(ST_MakePoint($15, $14), 4326)"
        : "jsonb_build_object('type','Point','coordinates',jsonb_build_array($15,$14),'latitude',$14,'longitude',$15)";
    const lonExpr = usePostgis
        ? "ST_X(location::geometry)"
        : "(location->>'longitude')::double precision";
    const latExpr = usePostgis
        ? "ST_Y(location::geometry)"
        : "(location->>'latitude')::double precision";

    const query = `
    INSERT INTO firs (
      fir_no, crime_type, section, act_type, section_code, severity, category, classification_id,
      victim_gender, victim_age, sensitive_notes_enc, date_time, location, police_station, zone
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
      CASE WHEN $11 IS NULL THEN NULL ELSE pgp_sym_encrypt($11, $12) END,
      $13, ${locationExpr}, $16, $17)
    RETURNING id, fir_no, crime_type, section, date_time,
           ${lonExpr} as longitude,
           ${latExpr} as latitude,
           police_station, zone, act_type, section_code, severity, category, classification_id,
           victim_gender, victim_age;
  `;
    const values = [
        fir_no,
        crime_type,
        section,
        act_type || null,
        section_code || section || null,
        severity ?? 1,
        category || null,
        classification_id || null,
        victim_gender || null,
        victim_age || null,
        sensitive_notes || null,
        env.dbEncryptionKey || "change_me",
        date_time,
        latitude,
        longitude,
        police_station,
        zone,
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
};

export const getFIRById = async (id) => {
    const capabilities = await getSpatialCapabilities();
    const usePostgis = capabilities.firLocationSpatial;
    const lonExpr = usePostgis
        ? "ST_X(location::geometry)"
        : "(location->>'longitude')::double precision";
    const latExpr = usePostgis
        ? "ST_Y(location::geometry)"
        : "(location->>'latitude')::double precision";
    const query = `
    SELECT id, fir_no, crime_type, section, act_type, section_code, severity, category,
           classification_id, victim_gender, victim_age, date_time,
           ${lonExpr} as longitude,
           ${latExpr} as latitude,
           police_station, zone
    FROM firs
    WHERE id = $1;
  `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
};

export const getFIRs = async ({
    crime_type,
    act_type,
    section_code,
    startDate,
    endDate,
    zone,
    police_station,
    page = 1,
    limit = 50,
}) => {
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const safePage = Math.max(parseInt(page, 10) || 1, 1);
    const offset = (safePage - 1) * safeLimit;
    const capabilities = await getSpatialCapabilities();
    const usePostgis = capabilities.firLocationSpatial;
    const lonExpr = usePostgis
        ? "ST_X(location::geometry)"
        : "(location->>'longitude')::double precision";
    const latExpr = usePostgis
        ? "ST_Y(location::geometry)"
        : "(location->>'latitude')::double precision";

    let query = `
    SELECT id, fir_no, crime_type, section, act_type, section_code, severity, category,
           classification_id, victim_gender, victim_age, date_time,
           ${lonExpr} as longitude,
           ${latExpr} as latitude,
           police_station, zone,
           COUNT(*) OVER() as total_count
    FROM firs
    WHERE 1=1
  `;
    const values = [];
    let paramIndex = 1;

    if (crime_type) {
        query += ` AND crime_type = $${paramIndex++}`;
        values.push(crime_type);
    }

    if (act_type) {
        query += ` AND act_type = $${paramIndex++}`;
        values.push(act_type);
    }

    if (section_code) {
        query += ` AND section_code = $${paramIndex++}`;
        values.push(section_code);
    }

    if (startDate) {
        query += ` AND date_time >= $${paramIndex++}`;
        values.push(startDate);
    }

    if (endDate) {
        query += ` AND date_time <= $${paramIndex++}`;
        values.push(endDate);
    }

    if (zone) {
        query += ` AND zone = $${paramIndex++}`;
        values.push(zone);
    }

    if (police_station) {
        query += ` AND police_station = $${paramIndex++}`;
        values.push(police_station);
    }

    query += ` ORDER BY date_time DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;

    values.push(safeLimit, offset);

    const result = await pool.query(query, values);
    const total = result.rows[0]?.total_count ? parseInt(result.rows[0].total_count, 10) : 0;

    return {
        items: result.rows.map(({ total_count, ...rest }) => rest),
        total,
        page: safePage,
        limit: safeLimit,
    };
};

export const createFIRsBulk = async (items) => {
    if (!items.length) {
        return [];
    }

    const capabilities = await getSpatialCapabilities();
    const usePostgis = capabilities.firLocationSpatial;
    const values = [];
    const placeholders = items.map((item, index) => {
        const baseIndex = index * 15;
        values.push(
            item.fir_no,
            item.crime_type,
            item.section || null,
            item.act_type || null,
            item.section_code || item.section || null,
            item.severity ?? 1,
            item.category || null,
            item.classification_id || null,
            item.victim_gender || null,
            item.victim_age || null,
            item.date_time,
            item.latitude,
            item.longitude,
            item.police_station || null,
            item.zone || null
        );

        const locationExpr = usePostgis
            ? `ST_SetSRID(ST_MakePoint($${baseIndex + 13}, $${baseIndex + 12}), 4326)`
            : `jsonb_build_object('type','Point','coordinates',jsonb_build_array($${baseIndex + 13},$${baseIndex + 12}),'latitude',$${baseIndex + 12},'longitude',$${baseIndex + 13})`;

        return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6}, $${baseIndex + 7}, $${baseIndex + 8}, $${baseIndex + 9}, $${baseIndex + 10}, $${baseIndex + 11}, ${locationExpr}, $${baseIndex + 14}, $${baseIndex + 15})`;
    });

    const lonExpr = usePostgis
        ? "ST_X(location::geometry)"
        : "(location->>'longitude')::double precision";
    const latExpr = usePostgis
        ? "ST_Y(location::geometry)"
        : "(location->>'latitude')::double precision";

    const query = `
    INSERT INTO firs (
      fir_no, crime_type, section, act_type, section_code, severity, category, classification_id,
      victim_gender, victim_age, date_time, location, police_station, zone
    )
    VALUES ${placeholders.join(", ")}
    ON CONFLICT (fir_no) DO NOTHING
    RETURNING id, fir_no, crime_type, section, act_type, section_code, severity, category,
              classification_id, victim_gender, victim_age, date_time,
              ${lonExpr} as longitude,
              ${latExpr} as latitude,
              police_station, zone;
  `;

    const result = await pool.query(query, values);
    return result.rows;
};
