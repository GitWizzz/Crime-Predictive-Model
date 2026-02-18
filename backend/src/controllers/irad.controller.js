import { ingestAccidents, fetchAccidents, getAccidentHotspots } from "../services/irad.service.js";

export const ingestIradHandler = async (req, res) => {
  try {
    const rows = await ingestAccidents(req.body.items);
    return res.status(201).json({
      success: true,
      message: "IRAD accidents ingested",
      data: { inserted: rows.length },
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
      data: null,
    });
  }
};

export const listIradHandler = async (req, res) => {
  try {
    const rows = await fetchAccidents(req.query);
    return res.status(200).json({
      success: true,
      message: "IRAD accidents retrieved",
      data: rows,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
      data: null,
    });
  }
};

export const iradHotspotsHandler = async (req, res) => {
  try {
    const result = await getAccidentHotspots(req.query);
    return res.status(200).json({
      success: true,
      message: "IRAD hotspots generated",
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
