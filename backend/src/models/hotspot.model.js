import { pool } from "../config/db.js";


export const getHotspots = async ({
    crimeType,
    startDate,
    endDate,
    zone,
    eps = 300,
    minPts = 4,
}) => {
    
    
    
    
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
        
        
        
        
        return {
            clusterId: `cluster_${row.cluster_id}`,
            centroid: JSON.parse(row.centroid),
            crimeCount: row.crime_count,
            boundary: JSON.parse(row.boundary),
            crimeDistribution: row.crime_distribution
        };
    });
};
