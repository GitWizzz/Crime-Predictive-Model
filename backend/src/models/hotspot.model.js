import { pool } from "../config/db.js";
import { getSpatialCapabilities } from "../utils/spatial.util.js";

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
            location,
            zone
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

    const capabilities = await getSpatialCapabilities();
    const usePostgis = capabilities.firLocationSpatial;

    if (usePostgis) {
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
    } else {
        query += `
    ),
    zone_points AS (
      SELECT
        COALESCE(zone, 'Unknown') AS cluster_id,
        COUNT(*)::int AS crime_count,
        AVG((location->>'longitude')::double precision) AS lon,
        AVG((location->>'latitude')::double precision) AS lat
      FROM filtered_data
      WHERE location IS NOT NULL
      GROUP BY COALESCE(zone, 'Unknown')
    ),
    zone_dist AS (
      SELECT
        COALESCE(zone, 'Unknown') AS cluster_id,
        crime_type,
        COUNT(*)::int AS cnt
      FROM filtered_data
      WHERE location IS NOT NULL
      GROUP BY COALESCE(zone, 'Unknown'), crime_type
    )
    SELECT
      zone_points.cluster_id,
      zone_points.crime_count,
      json_build_object('type','Point','coordinates',json_build_array(zone_points.lon, zone_points.lat))::text AS centroid,
      NULL::text AS boundary,
      COALESCE(json_object_agg(zone_dist.crime_type, zone_dist.cnt), '{}'::json) AS crime_distribution
    FROM zone_points
    LEFT JOIN zone_dist ON zone_dist.cluster_id = zone_points.cluster_id
    GROUP BY zone_points.cluster_id, zone_points.crime_count, zone_points.lon, zone_points.lat
  `;
    }

    if (usePostgis) {
        values.push(epsDegrees, minPts);
    }

    const result = await pool.query(query, values);

    return result.rows.map(row => {
        
        
        
        
        const centroid = typeof row.centroid === "string" ? JSON.parse(row.centroid) : row.centroid;
        const boundary = row.boundary
            ? (typeof row.boundary === "string" ? JSON.parse(row.boundary) : row.boundary)
            : null;
        return {
            clusterId: `cluster_${row.cluster_id}`,
            centroid,
            crimeCount: row.crime_count,
            boundary,
            crimeDistribution: row.crime_distribution
        };
    });
};
