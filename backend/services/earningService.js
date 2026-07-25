import Earning from "../models/Earning.js";

export const earningService = {
  // Create earning for a freelancer
  create: async (earningData) => {
    const earning = new Earning(earningData);
    return await earning.save();
  },

  // Get all earnings for a freelancer
  getByFreelancer: async (freelancerId) => {
    return await Earning.find({ freelancer: freelancerId })
      .populate("contract")
      .populate("job", "title budget")
      .populate("client", "fullName avatar")
      .sort({ createdAt: -1 });
  },

  // Get earnings by status
  getByFreelancerAndStatus: async (freelancerId, status) => {
    return await Earning.find({ freelancer: freelancerId, status })
      .populate("contract")
      .populate("job", "title budget")
      .populate("client", "fullName avatar")
      .sort({ createdAt: -1 });
  },

  // Get earning by contract
  getByContract: async (contractId) => {
    return await Earning.findOne({ contract: contractId })
      .populate("freelancer", "fullName avatar")
      .populate("job", "title budget")
      .populate("client", "fullName avatar");
  },

  // Update earning status
  updateStatus: async (earningId, status) => {
    return await Earning.findByIdAndUpdate(
      earningId,
      { status },
      { new: true }
    ).populate("contract").populate("job", "title budget");
  },

  // Get summary for freelancer
  getSummary: async (freelancerId) => {
    const earnings = await Earning.find({ freelancer: freelancerId });

    return {
      total: earnings.reduce((sum, e) => sum + e.amount, 0),
      pending: earnings
        .filter(e => e.status === "pending")
        .reduce((sum, e) => sum + e.amount, 0),
      inEscrow: earnings
        .filter(e => e.status === "in_escrow")
        .reduce((sum, e) => sum + e.amount, 0),
      released: earnings
        .filter(e => e.status === "released")
        .reduce((sum, e) => sum + e.amount, 0),
      count: earnings.length,
    };
  },

  // Delete earning
  delete: async (earningId) => {
    return await Earning.findByIdAndDelete(earningId);
  },
};
