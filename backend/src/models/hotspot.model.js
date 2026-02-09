import { pool } from "../config/db.js";

/**
 * Executes Spatial Clustering (DBSCAN) using PostGIS.
 * Returns clustered hotspots with centroids, boundaries, and crime distribution.
 *
 * @param {Object} filters
 * @param {string} filters.crimeType
 * @param {string} filters.startDate
 * @param {string} filters.endDate
 * @param {string} filters.zone
 * @param {number} eps - Distance in meters (default 300)
 * @param {number} minPts - Minimum points to form a cluster (default 4)
 * @returns {Promise<Array>}
 */
export const getHotspots = async ({
    crimeType,
    startDate,
    endDate,
    zone,
    eps = 300,
    minPts = 4,
}) => {
    // Convert meters to approximate degrees for ST_ClusterDBSCAN (EPSG:4326)
    // 1 degree lat ~= 111,000 meters at equator.
    // ST_ClusterDBSCAN in PostGIS < 3.0 only supports geometry (units of the projection).
    // 4326 uses degrees.
    const epsDegrees = eps / 111000.0;

    let query = `
    WITH filtered_data AS (
        SELECT 
            id, 
            crime_type, 
            location
        FROM firs
        WHERE 1=1
  `;

    const values = [];
    let paramIndex = 1;

    if (crimeType) {
        query += ` AND crime_type = $${paramIndex++}`;
        values.push(crimeType);
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

    // Add ST_ClusterDBSCAN.
    // We cast location to geometry for the function.
    // Using epsDegrees.
    query += `
    ),
    clustered_data AS (
        SELECT 
            id,
            crime_type,
            location::geometry as geom,
            ST_ClusterDBSCAN(location::geometry, $${paramIndex++}, $${paramIndex++}) OVER () AS cid
        FROM filtered_data
    )
    SELECT 
        cid as cluster_id,
        COUNT(*)::int as crime_count,
        ST_AsGeoJSON(ST_Centroid(ST_Collect(geom))) as centroid,
        ST_AsGeoJSON(ST_ConvexHull(ST_Collect(geom))) as boundary,
        json_object_agg(crime_type, count)::json as crime_distribution
    FROM (
        SELECT 
            cid, 
            geom,
            crime_type,
            COUNT(*) as count
        FROM clustered_data
        WHERE cid IS NOT NULL
        GROUP BY cid, geom, crime_type
    ) sub
    GROUP BY cid
  `;

    values.push(epsDegrees, minPts);

    const result = await pool.query(query, values);

    return result.rows.map(row => {
        // PostGIS json_object_agg might return keys as strings, values as numbers.
        // ensure centroid and boundary are parsed if they are strings.
        // pg driver usually parses JSON columns automatically if type is json,
        // but ST_AsGeoJSON returns text.
        return {
            clusterId: `cluster_${row.cluster_id}`,
            centroid: JSON.parse(row.centroid),
            crimeCount: row.crime_count,
            boundary: JSON.parse(row.boundary),
            crimeDistribution: row.crime_distribution
        };
    });
};
