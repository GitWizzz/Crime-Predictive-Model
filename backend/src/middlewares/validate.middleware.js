export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      data: result.error.flatten(),
    });
  }
  req.body = result.data;
  next();
};

export const validateQuery = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.query);
  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      data: result.error.flatten(),
    });
  }
  Object.assign(req.query, result.data);
  next();
};

export const validateParams = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.params);
  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      data: result.error.flatten(),
    });
  }
  Object.assign(req.params, result.data);
  next();
};
