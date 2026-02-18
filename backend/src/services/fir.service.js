import { createFIR, getFIRById, getFIRs, createFIRsBulk } from "../models/fir.model.js";
import { findClassification } from "../models/classification.model.js";

export const createNewFIR = async (data) => {
    const { fir_no, latitude, longitude, crime_type, date_time } = data;

    if (!fir_no || !crime_type || !date_time || !latitude || !longitude) {
        throw new Error("Missing required fields");
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    if (isNaN(lat) || lat < -90 || lat > 90) {
        throw new Error("Invalid latitude. Must be between -90 and 90.");
    }
    if (isNaN(lon) || lon < -180 || lon > 180) {
        throw new Error("Invalid longitude. Must be between -180 and 180.");
    }

    
    

    let enriched = { ...data, latitude: lat, longitude: lon };
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
    return await getFIRs(filters);
};

export const createBulkFIRs = async (items) => {
    if (!Array.isArray(items) || items.length === 0) {
        throw new Error("No FIR items provided");
    }

    return await createFIRsBulk(items);
};
