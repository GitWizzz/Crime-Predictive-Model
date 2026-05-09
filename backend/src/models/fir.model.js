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
    victim_count,
    sensitive_notes,
    date_time,
    occurred_at,
    latitude,
    longitude,
    location_name,
    police_station,
    zone,
    status,
    description,
    source,
}) => {
    const ts = occurred_at || date_time;
    const capabilities = await getSpatialCapabilities();
    const usePostgis = capabilities.firLocationSpatial;
    const locationExpr = usePostgis
        ? "CASE WHEN $15::double precision IS NULL OR $14::double precision IS NULL THEN NULL ELSE ST_SetSRID(ST_MakePoint($15::double precision, $14::double precision), 4326) END"
        : "CASE WHEN $15::double precision IS NULL OR $14::double precision IS NULL THEN NULL ELSE jsonb_build_object('lat',$14::double precision,'lon',$15::double precision) END";
    const lonExpr = usePostgis
        ? "ST_X(location::geometry)"
        : "(location->>'lon')::double precision";
    const latExpr = usePostgis
        ? "ST_Y(location::geometry)"
        : "(location->>'lat')::double precision";

    const query = `
    INSERT INTO firs (
      fir_no, crime_type, section, act_type, section_code, severity, category, classification_id,
      victim_gender, victim_age, sensitive_notes_enc, occurred_at, location, police_station, zone,
      victim_count, location_name, status, description, source
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
      CASE WHEN $11::text IS NULL THEN NULL ELSE pgp_sym_encrypt($11::text, $12) END,
      $13, ${locationExpr}, $16, $17, $18, $19, $20, $21, $22)
    RETURNING id, fir_no, crime_type, section, occurred_at, occurred_at AS date_time,
           ${lonExpr} as longitude,
           ${latExpr} as latitude,
           police_station, zone, act_type, section_code, severity, category, classification_id,
           victim_gender, victim_age, victim_count, location_name, status, description, source;
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
        ts,
        latitude,
        longitude,
        police_station,
        zone,
        victim_count || 1,
        location_name || null,
        status || "PENDING",
        description || null,
        source || "MANUAL",
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
};

export const getFIRById = async (id) => {
    const capabilities = await getSpatialCapabilities();
    const usePostgis = capabilities.firLocationSpatial;
    const lonExpr = usePostgis
        ? "ST_X(location::geometry)"
        : "(location->>'lon')::double precision";
    const latExpr = usePostgis
        ? "ST_Y(location::geometry)"
        : "(location->>'lat')::double precision";
    const query = `
    SELECT id, fir_no, crime_type, section, act_type, section_code, severity, category,
           classification_id, victim_gender, victim_age, victim_count, occurred_at,
           occurred_at AS date_time,
           ${lonExpr} as longitude,
           ${latExpr} as latitude,
           police_station, zone, location_name, status, description, source
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
    status,
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
        : "(location->>'lon')::double precision";
    const latExpr = usePostgis
        ? "ST_Y(location::geometry)"
        : "(location->>'lat')::double precision";

    let query = `
    SELECT id, fir_no, crime_type, section, act_type, section_code, severity, category,
           classification_id, victim_gender, victim_age, victim_count, occurred_at,
           occurred_at AS date_time,
           ${lonExpr} as longitude,
           ${latExpr} as latitude,
           police_station, zone, location_name, status, description, source,
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
        query += ` AND occurred_at >= $${paramIndex++}`;
        values.push(startDate);
    }

    if (endDate) {
        query += ` AND occurred_at <= $${paramIndex++}`;
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

    if (status) {
        query += ` AND status = $${paramIndex++}`;
        values.push(status);
    }

    query += ` ORDER BY occurred_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;

    values.push(safeLimit, offset);

    const result = await pool.query(query, values);
    const total = result.rows[0]?.total_count ? parseInt(result.rows[0].total_count, 10) : 0;

    return {
        items: result.rows.map(({ total_count, ...rest }) => rest),
        firs: result.rows.map(({ total_count, ...rest }) => rest),
        total,
        page: safePage,
        limit: safeLimit,
        total_pages: Math.ceil(total / safeLimit),
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
        const baseIndex = index * 20;
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
            item.occurred_at || item.date_time,
            item.latitude ?? null,
            item.longitude ?? null,
            item.police_station || null,
            item.zone || null,
            item.victim_count || 1,
            item.location_name || null,
            item.status || "PENDING",
            item.description || null,
            item.source || "BULK_IMPORT"
        );

        const locationExpr = usePostgis
            ? `CASE WHEN $${baseIndex + 13} IS NULL OR $${baseIndex + 12} IS NULL THEN NULL ELSE ST_SetSRID(ST_MakePoint($${baseIndex + 13}, $${baseIndex + 12}), 4326) END`
            : `CASE WHEN $${baseIndex + 13} IS NULL OR $${baseIndex + 12} IS NULL THEN NULL ELSE jsonb_build_object('lat',$${baseIndex + 12},'lon',$${baseIndex + 13}) END`;

        return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6}, $${baseIndex + 7}, $${baseIndex + 8}, $${baseIndex + 9}, $${baseIndex + 10}, $${baseIndex + 11}, ${locationExpr}, $${baseIndex + 14}, $${baseIndex + 15}, $${baseIndex + 16}, $${baseIndex + 17}, $${baseIndex + 18}, $${baseIndex + 19}, $${baseIndex + 20})`;
    });

    const lonExpr = usePostgis
        ? "ST_X(location::geometry)"
        : "(location->>'lon')::double precision";
    const latExpr = usePostgis
        ? "ST_Y(location::geometry)"
        : "(location->>'lat')::double precision";

    const query = `
    INSERT INTO firs (
      fir_no, crime_type, section, act_type, section_code, severity, category, classification_id,
      victim_gender, victim_age, occurred_at, location, police_station, zone,
      victim_count, location_name, status, description, source
    )
    VALUES ${placeholders.join(", ")}
    ON CONFLICT (fir_no) DO NOTHING
    RETURNING id, fir_no, crime_type, section, act_type, section_code, severity, category,
              classification_id, victim_gender, victim_age, victim_count, occurred_at,
              occurred_at AS date_time,
              ${lonExpr} as longitude,
              ${latExpr} as latitude,
              police_station, zone, location_name, status, description, source;
  `;

    const result = await pool.query(query, values);
    return result.rows;
};

export const searchFIRRecords = async ({ q, zone, page = 1, limit = 50 }) => {
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const safePage = Math.max(parseInt(page, 10) || 1, 1);
    const offset = (safePage - 1) * safeLimit;
    const capabilities = await getSpatialCapabilities();
    const usePostgis = capabilities.firLocationSpatial;
    const lonExpr = usePostgis
        ? "ST_X(location::geometry)"
        : "(location->>'lon')::double precision";
    const latExpr = usePostgis
        ? "ST_Y(location::geometry)"
        : "(location->>'lat')::double precision";

    const values = [`%${q}%`];
    let paramIndex = 2;
    let zoneFilter = "";
    if (zone) {
        zoneFilter = ` AND zone = $${paramIndex++}`;
        values.push(zone);
    }

    const query = `
      SELECT id, fir_no, crime_type, section, act_type, section_code, severity, category,
             classification_id, victim_gender, victim_age, victim_count, occurred_at,
             occurred_at AS date_time,
             ${lonExpr} as longitude,
             ${latExpr} as latitude,
             police_station, zone, location_name, status, description, source,
             CASE
               WHEN lower(fir_no) = lower($1) THEN 1.0
               WHEN lower(crime_type) LIKE lower($1) THEN 0.8
               ELSE 0.5
             END AS relevance,
             COUNT(*) OVER() as total_count
      FROM firs
      WHERE (
        fir_no ILIKE $1
        OR crime_type ILIKE $1
        OR COALESCE(section, '') ILIKE $1
        OR COALESCE(section_code, '') ILIKE $1
        OR COALESCE(location_name, '') ILIKE $1
        OR COALESCE(description, '') ILIKE $1
        OR COALESCE(police_station, '') ILIKE $1
        OR COALESCE(zone, '') ILIKE $1
      )
      ${zoneFilter}
      ORDER BY relevance DESC, occurred_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++};
    `;

    values.push(safeLimit, offset);
    const result = await pool.query(query, values);
    const total = result.rows[0]?.total_count ? parseInt(result.rows[0].total_count, 10) : 0;
    const items = result.rows.map(({ total_count, ...rest }) => rest);
    return {
        items,
        firs: items,
        total,
        page: safePage,
        limit: safeLimit,
        total_pages: Math.ceil(total / safeLimit),
    };
};
