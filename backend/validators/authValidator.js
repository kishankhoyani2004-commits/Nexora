import { body, validationResult } from "express-validator";

export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map((err) => ({ field: err.path, message: err.msg })),
    });
  }
  next();
};

export const registerRules = [
  body("fullName").notEmpty().withMessage("Full name is required").trim(),
  body("email").isEmail().withMessage("Please provide a valid email address"),
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters long"),
  body("role").isIn(["client", "freelancer"]).withMessage("Role must be client or freelancer"),
  body("location").optional().trim(),
];

export const loginRules = [
  body("email").isEmail().withMessage("Please provide a valid email"),
  body("password").notEmpty().withMessage("Password is required"),
];

export const forgotPasswordRules = [
  body("email").isEmail().withMessage("Please provide a valid email"),
];

export const resetPasswordRules = [
  body("email").isEmail().withMessage("Please provide a valid email"),
  body("otp").isLength({ min: 6, max: 6 }).withMessage("OTP must be 6 digits"),
  body("newPassword").isLength({ min: 6 }).withMessage("Password must be at least 6 characters long"),
];
