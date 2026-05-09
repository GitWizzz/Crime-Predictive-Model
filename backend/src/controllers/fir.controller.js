import { createNewFIR, fetchFIRById, fetchFIRs, createBulkFIRs, searchFIRsByText } from "../services/fir.service.js";
import { emitEvent } from "../utils/eventBus.js";

export const addFIR = async (req, res) => {
    try {
        const fir = await createNewFIR(req.body);
        emitEvent("fir_created", { id: fir.id, fir_no: fir.fir_no });
        return res.status(201).json({
            success: true,
            message: "FIR added successfully",
            data: fir,
        });
    } catch (error) {
        if (error.code === '23505') { 
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
        const result = await fetchFIRs(req.query);
        return res.status(200).json({
            success: true,
            message: "FIRs retrieved successfully",
            data: result,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
            data: null,
        });
    }
};

export const bulkAddFIRs = async (req, res) => {
    try {
        const items = req.body.items || req.body.firs;
        const rows = await createBulkFIRs(items);
        emitEvent("fir_bulk_created", { inserted: rows.length });
        return res.status(201).json({
            success: true,
            message: "Bulk FIR import completed",
            data: {
                inserted: rows.length,
                skipped: items.length - rows.length,
                items: rows,
            },
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
            data: null,
        });
    }
};

export const searchFIRs = async (req, res) => {
    try {
        const result = await searchFIRsByText(req.query);
        return res.status(200).json({
            success: true,
            message: "FIR search completed successfully",
            data: result,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
            data: null,
        });
    }
};

export const addCctnsFIR = async (req, res) => {
    try {
        const payload = req.body;
        const sections = Array.isArray(payload.sections)
            ? payload.sections.join(",")
            : payload.sections;
        const fir = await createNewFIR({
            fir_no: payload.fir_no,
            crime_type: payload.crime_type,
            act_type: payload.act_type,
            section: sections,
            section_code: sections,
            category: payload.category,
            severity: payload.severity,
            date_time: payload.occurred_at,
            latitude: payload.latitude,
            longitude: payload.longitude,
            police_station: payload.police_station,
            zone: payload.zone,
            victim_gender: payload.victim_gender,
            victim_age: payload.victim_age,
        });
        emitEvent("fir_created", { id: fir.id, fir_no: fir.fir_no });
        return res.status(201).json({
            success: true,
            message: "CCTNS FIR ingested",
            data: fir,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
            data: null,
        });
    }
};
