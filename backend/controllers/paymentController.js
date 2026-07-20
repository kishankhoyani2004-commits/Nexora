import { createPaymentIntent } from "../services/stripeService.js";
import Contract from "../models/Contract.js";

export const createIntent = async (req, res, next) => {
  try {
    const { contractId } = req.body;

    const contract = await Contract.findById(contractId);
    if (!contract) {
      return res.status(404).json({ success: false, message: "Contract not found." });
    }

    const intent = await createPaymentIntent(contract.budget, "usd", {
      contractId: contract._id.toString(),
      clientId: req.user.id,
    });

    contract.stripePaymentIntentId = intent.id;
    await contract.save();

    res.status(200).json({
      success: true,
      data: {
        clientSecret: intent.clientSecret,
        paymentIntentId: intent.id,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const handleWebhook = async (req, res, next) => {
  try {
    const event = req.body;
    console.log(`[STRIPE WEBHOOK] Received event: ${event.type}`);

    if (event.type === "payment_intent.succeeded") {
      const intent = event.data.object;
      const contractId = intent.metadata.contractId;

      const contract = await Contract.findById(contractId);
      if (contract) {
        contract.escrowStatus = "funded";
        contract.status = "active";
        await contract.save();
        console.log(`✅ [STRIPE SUCCESS] Contract ${contractId} marked as active and funded.`);
      }
    }

    res.status(200).json({ received: true });
  } catch (error) {
    next(error);
  }
};

export const listTransactions = async (req, res, next) => {
  try {
    const query = req.user.role === "client" ? { client: req.user._id } : { freelancer: req.user._id };

    // Get contracts with funded or released escrow as transaction history
    const contracts = await Contract.find({
      ...query,
      escrowStatus: { $in: ["funded", "released", "refunded"] },
    }).populate("freelancer client", "fullName email avatar");

    const history = contracts.map((c) => ({
      id: c._id.toString(),
      projectTitle: c.title,
      amount: c.budget,
      type: c.escrowStatus === "released" && req.user.role === "freelancer" ? "payout" : "charge",
      status: c.escrowStatus === "released" ? "completed" : "pending",
      date: c.updatedAt.toISOString(),
    }));

    res.status(200).json({ success: true, data: history });
  } catch (error) {
    next(error);
  }
};
