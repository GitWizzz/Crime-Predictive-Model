import { generateHotspots } from "../services/hotspot.service.js";

export const getHotspots = async (req, res) => {
    try {
        const hotspots = await generateHotspots(req.query);
        return res.status(200).json({
            success: true,
            message: "Hotspots generated successfully",
            data: hotspots,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
            data: null,
        });
    }
};
