import User from "../models/User.js";
import Job from "../models/Job.js";
import Proposal from "../models/Proposal.js";
import Contract from "../models/Contract.js";

export const dashboardStats = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalJobs = await Job.countDocuments();
    const totalProposals = await Proposal.countDocuments();
    const totalContracts = await Contract.countDocuments();

    // Sum total transaction value of completed/active contracts
    const escrowSumResult = await Contract.aggregate([
      { $group: { _id: null, total: { $sum: "$budget" } } },
    ]);
    const totalEscrowAmount = escrowSumResult[0] ? escrowSumResult[0].total : 0;

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalJobs,
        totalProposals,
        totalContracts,
        totalEscrowAmount,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const listUsers = async (req, res, next) => {
  try {
    const users = await User.find().select("-password");
    res.status(200).json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
};

export const suspendUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    // Toggle verified status as a simulation of active/suspend states
    user.verified = !user.verified;
    await user.save();

    res.status(200).json({
      success: true,
      message: `User ${user.verified ? "activated" : "suspended"} successfully.`,
      user,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    await User.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: "User deleted successfully." });
  } catch (error) {
    next(error);
  }
};
