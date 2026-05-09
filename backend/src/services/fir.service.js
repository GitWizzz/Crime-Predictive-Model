import { createFIR, getFIRById, getFIRs, createFIRsBulk, searchFIRRecords } from "../models/fir.model.js";
import { findClassification } from "../models/classification.model.js";

export const createNewFIR = async (data) => {
    const normalized = {
        ...data,
        date_time: data.date_time || data.occurred_at,
    };
    const { fir_no, latitude, longitude, crime_type, date_time } = normalized;

    if (!fir_no || !crime_type || !date_time) {
        throw new Error("Missing required fields");
    }

    const hasLocation = latitude !== undefined && latitude !== null && longitude !== undefined && longitude !== null;
    const lat = hasLocation ? parseFloat(latitude) : null;
    const lon = hasLocation ? parseFloat(longitude) : null;

    if (hasLocation && (isNaN(lat) || lat < -90 || lat > 90)) {
        throw new Error("Invalid latitude. Must be between -90 and 90.");
    }
    if (hasLocation && (isNaN(lon) || lon < -180 || lon > 180)) {
        throw new Error("Invalid longitude. Must be between -180 and 180.");
    }

    
    

    let enriched = { ...normalized, latitude: lat, longitude: lon };
    if (!enriched.classification_id && (enriched.act_type || enriched.section_code)) {
        const actType = enriched.act_type || "IPC";
        const sectionCode = enriched.section_code || enriched.section;
        if (sectionCode) {
            const classification = await findClassification({ act_type: actType, section_code: sectionCode });
            if (classification) {
                enriched = {
                    ...enriched,
                    classification_id: classification.id,
                    category: enriched.category || classification.category,
                    severity: enriched.severity || classification.severity,
                };
            }
        }
    }

    return await createFIR(enriched);
};

export const fetchFIRById = async (id) => {
    const fir = await getFIRById(id);
    if (!fir) {
        throw new Error("FIR not found");
    }
    return fir;
};

export const fetchFIRs = async (filters) => {
    return await getFIRs({
        ...filters,
        crime_type: filters.crime_type || filters.crimeType,
        startDate: filters.startDate || filters.fromDate,
        endDate: filters.endDate || filters.toDate,
    });
};

export const createBulkFIRs = async (items) => {
    if (!Array.isArray(items) || items.length === 0) {
        throw new Error("No FIR items provided");
    }

    return await createFIRsBulk(
        items.map((item) => ({
            ...item,
            date_time: item.date_time || item.occurred_at,
        }))
    );
};

export const searchFIRsByText = async (filters) => {
    return await searchFIRRecords(filters);
};
