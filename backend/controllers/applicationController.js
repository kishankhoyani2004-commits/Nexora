import { applicationService } from "../services/applicationService.js";
import { earningService } from "../services/earningService.js";
import { notifyUser } from "../services/notificationService.js";

export const applicationController = {
  // ── Get all pending applications for a client's jobs ──
  getPendingApplications: async (req, res) => {
    try {
      const clientId = req.user.id;
      const applications = await applicationService.getPendingApplicationsForClient(clientId);

      res.json({
        success: true,
        data: applications,
        count: applications.length,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  },

  // ── Get applications for a specific job ──
  getJobApplications: async (req, res) => {
    try {
      const { jobId } = req.params;
      const applications = await applicationService.getApplicationsForJob(jobId);

      res.json({
        success: true,
        data: applications,
        count: applications.length,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  },

  // ── Accept application ──
  acceptApplication: async (req, res) => {
    try {
      const { applicationId } = req.params;
      const clientId = req.user.id;

      const result = await applicationService.acceptApplication(applicationId, clientId);

      await notifyUser({
        io: req.app.get("io"),
        recipient: result.application.freelancer,
        title: "Proposal accepted!",
        message: `Your proposal for "${result.contract.title}" was accepted. The project has started.`,
        type: "project",
        link: `/workspace/${result.contract.id}`,
      });

      res.json({
        success: true,
        message: "Application accepted! Contract and earning created.",
        data: result,
      });
    } catch (err) {
      res.status(400).json({
        success: false,
        message: err.message,
      });
    }
  },

  // ── Reject application ──
  rejectApplication: async (req, res) => {
    try {
      const { applicationId } = req.params;
      const clientId = req.user.id;

      const application = await applicationService.rejectApplication(applicationId, clientId);

      res.json({
        success: true,
        message: "Application rejected.",
        data: application,
      });
    } catch (err) {
      res.status(400).json({
        success: false,
        message: err.message,
      });
    }
  },

  // ── Withdraw application (freelancer) ──
  withdrawApplication: async (req, res) => {
    try {
      const { applicationId } = req.params;
      const freelancerId = req.user.id;

      const application = await applicationService.withdrawApplication(applicationId, freelancerId);

      res.json({
        success: true,
        message: "Application withdrawn.",
        data: application,
      });
    } catch (err) {
      res.status(400).json({
        success: false,
        message: err.message,
      });
    }
  },

  // ── Get freelancer earnings ──
  getFreelancerEarnings: async (req, res) => {
    try {
      const freelancerId = req.user.id;
      const earnings = await earningService.getByFreelancer(freelancerId);
      const summary = await earningService.getSummary(freelancerId);

      res.json({
        success: true,
        data: {
          earnings,
          summary,
        },
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  },

  // ── Get earnings summary ──
  getEarningsSummary: async (req, res) => {
    try {
      const freelancerId = req.user.id;
      const summary = await earningService.getSummary(freelancerId);

      res.json({
        success: true,
        data: summary,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  },
};
