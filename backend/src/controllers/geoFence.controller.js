import {
  createGeoFence,
  deleteGeoFence,
  listGeoFences,
  updateGeoFence,
} from "../models/geoFence.model.js";

export const createGeoFenceHandler = async (req, res) => {
  try {
    const data = await createGeoFence({ ...req.body, created_by: req.user.id });
    return res.status(201).json({
      success: true,
      message: "Geo-fence created successfully",
      data,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
      data: null,
    });
  }
};

export const listGeoFencesHandler = async (req, res) => {
  try {
    const data = await listGeoFences(req.query);
    return res.status(200).json({
      success: true,
      message: "Geo-fences fetched successfully",
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
      data: null,
    });
  }
};

export const updateGeoFenceHandler = async (req, res) => {
  try {
    const data = await updateGeoFence({ id: req.params.id, ...req.body });
    if (!data) throw new Error("Geo-fence not found");
    return res.status(200).json({
      success: true,
      message: "Geo-fence updated successfully",
      data,
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message: error.message,
      data: null,
    });
  }
};

export const deleteGeoFenceHandler = async (req, res) => {
  try {
    const data = await deleteGeoFence(req.params.id);
    if (!data) throw new Error("Geo-fence not found");
    return res.status(200).json({
      success: true,
      message: "Geo-fence deleted successfully",
      data,
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message: error.message,
      data: null,
    });
  }
};
