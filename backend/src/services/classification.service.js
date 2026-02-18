import {
  listClassifications,
  findClassification,
  createClassification,
} from "../models/classification.model.js";

export const fetchClassifications = async () => {
  return await listClassifications();
};

export const lookupClassification = async (act_type, section_code) => {
  const row = await findClassification({ act_type, section_code });
  if (!row) {
    throw new Error("Classification not found");
  }
  return row;
};

export const createNewClassification = async (data) => {
  return await createClassification(data);
};
