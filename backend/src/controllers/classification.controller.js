import {
  fetchClassifications,
  lookupClassification,
  createNewClassification,
} from "../services/classification.service.js";

export const listClassificationsHandler = async (_req, res) => {
  try {
    const rows = await fetchClassifications();
    return res.status(200).json({
      success: true,
      message: "Classifications retrieved successfully",
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

export const lookupClassificationHandler = async (req, res) => {
  try {
    const { act_type, section_code } = req.query;
    const row = await lookupClassification(act_type, section_code);
    return res.status(200).json({
      success: true,
      message: "Classification retrieved successfully",
      data: row,
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message: error.message,
      data: null,
    });
  }
};

export const createClassificationHandler = async (req, res) => {
  try {
    const row = await createNewClassification(req.body);
    return res.status(201).json({
      success: true,
      message: "Classification created successfully",
      data: row,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
      data: null,
    });
  }
};
