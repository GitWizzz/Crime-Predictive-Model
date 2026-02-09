import { createFIR, getFIRById, getFIRs } from "../models/fir.model.js";

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

    // Check if FIR exists logic could be here, but using DB unique constaint is better for race conditions.
    // We'll let DB throw duplicate error and catch it in controller or here.

    return await createFIR({ ...data, latitude: lat, longitude: lon });
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
