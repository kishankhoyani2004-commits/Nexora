import { body } from "express-validator";

export const proposalSubmitRules = [
  body("description").notEmpty().withMessage("Cover letter description is required"),
  body("bidAmount").isNumeric().withMessage("Bid amount must be a number"),
  body("estimatedDelivery").notEmpty().withMessage("Estimated delivery is required"),
];
