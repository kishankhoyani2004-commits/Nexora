import Stripe from "stripe";

const isConfigured = !!process.env.STRIPE_SECRET_KEY;
let stripeInstance;

if (isConfigured) {
  stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);
}

export const createPaymentIntent = async (amount, currency = "usd", metadata = {}) => {
  try {
    if (isConfigured) {
      const paymentIntent = await stripeInstance.paymentIntents.create({
        amount: Math.round(amount * 100), // Stripe expects cents
        currency,
        metadata,
      });
      return {
        id: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        amount: paymentIntent.amount / 100,
        status: paymentIntent.status,
      };
    } else {
      // Mock payment intent
      const mockId = `pi_mock_${Math.random().toString(36).substring(2, 15)}`;
      return {
        id: mockId,
        clientSecret: `${mockId}_secret_${Math.random().toString(36).substring(2, 8)}`,
        amount: amount,
        status: "requires_payment_method",
      };
    }
  } catch (error) {
    console.error("Stripe payment intent creation error:", error.message);
    throw error;
  }
};

export const refundPaymentIntent = async (paymentIntentId) => {
  try {
    if (isConfigured && !paymentIntentId.startsWith("pi_mock_")) {
      const refund = await stripeInstance.refunds.create({
        payment_intent: paymentIntentId,
      });
      return {
        id: refund.id,
        status: refund.status,
      };
    } else {
      console.log(`[STRIPE SIMULATED] Refund successfully created for payment intent: ${paymentIntentId}`);
      return {
        id: `re_mock_${Math.random().toString(36).substring(2, 15)}`,
        status: "succeeded",
      };
    }
  } catch (error) {
    console.error("Stripe refund error:", error.message);
    throw error;
  }
};
