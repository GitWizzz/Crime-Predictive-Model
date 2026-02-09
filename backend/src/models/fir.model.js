import { pool } from "../config/db.js";

export const createFIR = async ({
    fir_no,
    crime_type,
    section,
    date_time,
    latitude,
    longitude,
    police_station,
    zone,
}) => {
    const query = `
    INSERT INTO firs (
      fir_no, crime_type, section, date_time, location, police_station, zone
    )
    VALUES ($1, $2, $3, $4, ST_SetSRID(ST_MakePoint($6, $5), 4326), $7, $8)
    RETURNING id, fir_no, crime_type, section, date_time,
              ST_X(location::geometry) as longitude,
              ST_Y(location::geometry) as latitude,
              police_station, zone;
  `;
    const values = [
        fir_no,
        crime_type,
        section,
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
    const query = `
    SELECT id, fir_no, crime_type, section, date_time,
           ST_X(location::geometry) as longitude,
           ST_Y(location::geometry) as latitude,
           police_station, zone
    FROM firs
    WHERE id = $1;
  `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
};

export const getFIRs = async ({
    crime_type,
    startDate,
    endDate,
    zone,
    police_station,
}) => {
    let query = `
    SELECT id, fir_no, crime_type, section, date_time,
           ST_X(location::geometry) as longitude,
           ST_Y(location::geometry) as latitude,
           police_station, zone
    FROM firs
    WHERE 1=1
  `;
    const values = [];
    let paramIndex = 1;

    if (crime_type) {
        query += ` AND crime_type = $${paramIndex++}`;
        values.push(crime_type);
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

    query += ` ORDER BY date_time DESC`;

    const result = await pool.query(query, values);
    return result.rows;
};
