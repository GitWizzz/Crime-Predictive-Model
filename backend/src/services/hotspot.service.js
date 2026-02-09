import { getHotspots } from "../models/hotspot.model.js";

/**
 * Validates filters and invokes hotspot generation.
 * @param {Object} queryParams 
 */
export const generateHotspots = async (queryParams) => {
    const { fromDate, toDate, crimeType, zone } = queryParams;

    // Default DBSCAN params (from requirements)
    // Consumed as constants, but could be dynamic
    const EPS = 300; // meters
    const MIN_PTS = 4;

    const filters = {
        crimeType,
        startDate: fromDate,
        endDate: toDate,
        zone
    };

    const hotspots = await getHotspots({
        ...filters,
        eps: EPS,
        minPts: MIN_PTS
    });

    return hotspots;
};
