import {
  findUserById,
  updateUserFcmToken,
  listUsers,
  updateUserById,
  deactivateUserById,
} from "../models/user.model.js";

const mapUserProfile = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  policeStation: user.police_station,
  zone: user.zone,
  createdAt: user.created_at,
});

export const fetchCurrentUserProfile = async (userId) => {
  const user = await findUserById(userId);
  if (!user) {
    throw new Error("User not found");
  }
  return mapUserProfile(user);
};

export const saveCurrentUserFcmToken = async ({ userId, fcmToken }) => {
  const user = await updateUserFcmToken({ id: userId, fcmToken });
  if (!user) {
    throw new Error("User not found");
  }
  return { message: "FCM token updated" };
};

export const fetchUsers = async (filters) => {
  return await listUsers(filters);
};

export const updateUserAdmin = async ({ id, updates }) => {
  const user = await updateUserById({ id, ...updates });
  if (!user) throw new Error("User not found");
  return user;
};

export const deactivateUserAdmin = async (id) => {
  const user = await deactivateUserById(id);
  if (!user) throw new Error("User not found");
  return user;
};

export const createPasswordResetPlaceholder = async (id) => {
  const user = await findUserById(id);
  if (!user) throw new Error("User not found");
  return { message: "Password reset flow is ready for email integration", userId: Number(id) };
};
