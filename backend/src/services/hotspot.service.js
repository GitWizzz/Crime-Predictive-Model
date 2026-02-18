import { getHotspots } from "../models/hotspot.model.js";


export const generateHotspots = async (queryParams) => {
    const { fromDate, toDate, crimeType, zone } = queryParams;

    
    
    const EPS = 300; 
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
