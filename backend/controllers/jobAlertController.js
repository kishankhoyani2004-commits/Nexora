import JobAlert from "../models/JobAlert.js";

/** GET /api/job-alerts — list all alerts for the freelancer */
export const listAlerts = async (req, res, next) => {
  try {
    const alerts = await JobAlert.find({ freelancer: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: alerts });
  } catch (error) {
    next(error);
  }
};

/** POST /api/job-alerts — create a new alert */
export const createAlert = async (req, res, next) => {
  try {
    const {
      name, keywords, skills, category, budgetMin, budgetMax,
      experienceLevel, priceType, location, workType,
      frequency, notifyEmail, notifyInApp,
    } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: "Alert name is required." });
    }

    const alert = await JobAlert.create({
      freelancer:    req.user._id,
      name:          name.trim(),
      keywords:      keywords || [],
      skills:        skills   || [],
      category:      category || "",
      budgetMin:     budgetMin || 0,
      budgetMax:     budgetMax || 0,
      experienceLevel: experienceLevel || "",
      priceType:     priceType || "",
      location:      location  || "",
      workType:      workType  || "",
      frequency:     frequency || "daily",
      notifyEmail:   notifyEmail !== false,
      notifyInApp:   notifyInApp !== false,
    });

    res.status(201).json({ success: true, data: alert, message: "Job alert created." });
  } catch (error) {
    next(error);
  }
};

/** PATCH /api/job-alerts/:id — update an existing alert */
export const updateAlert = async (req, res, next) => {
  try {
    const alert = await JobAlert.findById(req.params.id);
    if (!alert) {
      return res.status(404).json({ success: false, message: "Alert not found." });
    }
    if (alert.freelancer.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Not authorized." });
    }

    const allowed = [
      "name","keywords","skills","category","budgetMin","budgetMax",
      "experienceLevel","priceType","location","workType",
      "frequency","notifyEmail","notifyInApp","active",
    ];
    allowed.forEach((key) => {
      if (req.body[key] !== undefined) alert[key] = req.body[key];
    });

    await alert.save();
    res.status(200).json({ success: true, data: alert, message: "Alert updated." });
  } catch (error) {
    next(error);
  }
};

/** PATCH /api/job-alerts/:id/toggle — pause / resume */
export const toggleAlert = async (req, res, next) => {
  try {
    const alert = await JobAlert.findById(req.params.id);
    if (!alert) {
      return res.status(404).json({ success: false, message: "Alert not found." });
    }
    if (alert.freelancer.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Not authorized." });
    }
    alert.active = !alert.active;
    await alert.save();
    res.status(200).json({
      success: true,
      data: alert,
      message: alert.active ? "Alert resumed." : "Alert paused.",
    });
  } catch (error) {
    next(error);
  }
};

/** DELETE /api/job-alerts/:id — delete alert */
export const deleteAlert = async (req, res, next) => {
  try {
    const alert = await JobAlert.findById(req.params.id);
    if (!alert) {
      return res.status(404).json({ success: false, message: "Alert not found." });
    }
    if (alert.freelancer.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Not authorized." });
    }
    await JobAlert.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: "Alert deleted." });
  } catch (error) {
    next(error);
  }
};
