import {
  fetchCurrentUserProfile,
  saveCurrentUserFcmToken,
  fetchUsers,
  updateUserAdmin,
  deactivateUserAdmin,
  createPasswordResetPlaceholder,
} from "../services/user.service.js";

export const getCurrentUserHandler = async (req, res) => {
  try {
    const user = await fetchCurrentUserProfile(req.user.id);
    return res.status(200).json({
      success: true,
      message: "Current user profile fetched successfully",
      data: user,
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message: error.message,
      data: null,
    });
  }
};

export const updateCurrentUserFcmTokenHandler = async (req, res) => {
  try {
    const result = await saveCurrentUserFcmToken({
      userId: req.user.id,
      fcmToken: req.body.fcmToken,
    });
    return res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message: error.message,
      data: null,
    });
  }
};

export const listUsersHandler = async (req, res) => {
  try {
    const data = await fetchUsers(req.query);
    return res.status(200).json({
      success: true,
      message: "Users fetched successfully",
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

export const updateUserHandler = async (req, res) => {
  try {
    const data = await updateUserAdmin({ id: req.params.id, updates: req.body });
    return res.status(200).json({
      success: true,
      message: "User updated successfully",
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

export const deleteUserHandler = async (req, res) => {
  try {
    const data = await deactivateUserAdmin(req.params.id);
    return res.status(200).json({
      success: true,
      message: "User deactivated successfully",
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

export const resetPasswordHandler = async (req, res) => {
  try {
    const data = await createPasswordResetPlaceholder(req.params.id);
    return res.status(200).json({
      success: true,
      message: data.message,
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
