import { body } from "express-validator";

export const jobCreateRules = [
  body("title").notEmpty().withMessage("Job title is required").trim(),
  body("description").notEmpty().withMessage("Job description is required"),
  body("budgetMin").isNumeric().withMessage("Minimum budget must be a number"),
  body("budgetMax").isNumeric().withMessage("Maximum budget must be a number"),
  body("priceType").isIn(["fixed", "hourly"]).withMessage("Price type must be fixed or hourly"),
  body("experienceLevel").isIn(["entry", "intermediate", "expert"]).withMessage("Experience level must be entry, intermediate, or expert"),
  body("category").notEmpty().withMessage("Category is required").trim(),
];
