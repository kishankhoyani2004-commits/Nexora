import {
  listBillingMethods,
  addBillingMethod,
  deleteBillingMethod,
  setDefaultBillingMethod,
  getBillingProfile,
  updateBillingProfile,
} from "../services/billingService.js";

// GET /api/billing/methods
export const getMethods = async (req, res, next) => {
  try {
    const methods = await listBillingMethods(req.user._id);
    res.status(200).json({ success: true, data: methods });
  } catch (error) {
    next(error);
  }
};

// POST /api/billing/methods
export const createMethod = async (req, res, next) => {
  try {
    const method = await addBillingMethod(req.user._id, req.body);
    res.status(201).json({ success: true, data: method, message: "Payment method added." });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ success: false, message: error.message });
    next(error);
  }
};

// DELETE /api/billing/methods/:id
export const removeMethod = async (req, res, next) => {
  try {
    await deleteBillingMethod(req.user._id, req.params.id);
    res.status(200).json({ success: true, message: "Payment method removed." });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ success: false, message: error.message });
    next(error);
  }
};

// PATCH /api/billing/methods/:id/default
export const makeDefault = async (req, res, next) => {
  try {
    const method = await setDefaultBillingMethod(req.user._id, req.params.id);
    res.status(200).json({ success: true, data: method, message: "Default payment method updated." });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ success: false, message: error.message });
    next(error);
  }
};

// GET /api/billing/profile
export const getProfile = async (req, res, next) => {
  try {
    const profile = await getBillingProfile(req.user._id);
    res.status(200).json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/billing/profile
export const updateProfile = async (req, res, next) => {
  try {
    const profile = await updateBillingProfile(req.user._id, req.body);
    res.status(200).json({ success: true, data: profile, message: "Billing details updated." });
  } catch (error) {
    next(error);
  }
};
