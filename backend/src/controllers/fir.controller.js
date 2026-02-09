import { createNewFIR, fetchFIRById, fetchFIRs } from "../services/fir.service.js";

export const addFIR = async (req, res) => {
    try {
        const fir = await createNewFIR(req.body);
        return res.status(201).json({
            success: true,
            message: "FIR added successfully",
            data: fir,
        });
    } catch (error) {
        if (error.code === '23505') { // Postgres duplicate key error
            return res.status(409).json({
                success: false,
                message: "FIR number already exists",
                data: null,
            });
        }
        return res.status(400).json({
            success: false,
            message: error.message,
            data: null,
        });
    }
};

export const getFIR = async (req, res) => {
    try {
        const fir = await fetchFIRById(req.params.id);
        return res.status(200).json({
            success: true,
            message: "FIR retrieved successfully",
            data: fir,
        });
    } catch (error) {
        return res.status(404).json({
            success: false,
            message: error.message,
            data: null,
        });
    }
};

export const listFIRs = async (req, res) => {
    try {
        const { crime_type, startDate, endDate, zone, police_station } = req.query;
        const firs = await fetchFIRs({ crime_type, startDate, endDate, zone, police_station });
        return res.status(200).json({
            success: true,
            message: "FIRs retrieved successfully",
            data: firs,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
            data: null,
        });
    }
};
