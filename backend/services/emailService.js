import nodemailer from "nodemailer";

const isConfigured =
  process.env.SMTP_HOST &&
  process.env.SMTP_PORT &&
  process.env.SMTP_USER &&
  process.env.SMTP_PASS;

let transporter;

if (isConfigured) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10),
    secure: process.env.SMTP_PORT === "465",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export const sendEmail = async ({ email, subject, text, html }) => {
  try {
    if (isConfigured) {
      const mailOptions = {
        from: process.env.FROM_EMAIL || '"Nexora Marketplace" <noreply@nexora.com>',
        to: email,
        subject,
        text,
        html,
      };

      await transporter.sendMail(mailOptions);
      console.log(`✉️ Email successfully sent to ${email}`);
      return true;
    } else {
      console.log(`
============================================================
[SMTP SIMULATION] Email dispatch to: ${email}
Subject: ${subject}
Message Body:
${text}
============================================================
      `);
      return true;
    }
  } catch (error) {
    console.error("SMTP Delivery Error:", error.message);
    return false;
  }
};

export const sendVerificationEmail = async (email, name, code) => {
  const subject = "Verify Your Nexora Account";
  const text = `Hello ${name},\n\nYour 6-digit verification code is: ${code}. This code expires in 24 hours.`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="color: #6366f1;">Welcome to Nexora!</h2>
      <p>Hello <strong>${name}</strong>,</p>
      <p>Thank you for registering. Please enter the following 6-digit verification code to activate your account:</p>
      <div style="font-size: 24px; font-weight: bold; background-color: #f3f4f6; color: #4338ca; text-align: center; padding: 15px; border-radius: 6px; letter-spacing: 4px; margin: 20px 0;">
        ${code}
      </div>
      <p style="font-size: 13px; color: #6b7280;">This code is valid for 24 hours. If you did not register for Nexora, you can safely ignore this email.</p>
    </div>
  `;
  return sendEmail({ email, subject, text, html });
};

export const sendOtpEmail = async (email, code) => {
  const subject = "Reset Your Nexora Password";
  const text = `Your OTP code to reset your password is: ${code}. This code expires in 10 minutes.`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="color: #6366f1;">Password Reset Request</h2>
      <p>Please enter the following 6-digit One-Time Password (OTP) to reset your password:</p>
      <div style="font-size: 24px; font-weight: bold; background-color: #f3f4f6; color: #4338ca; text-align: center; padding: 15px; border-radius: 6px; letter-spacing: 4px; margin: 20px 0;">
        ${code}
      </div>
      <p style="font-size: 13px; color: #6b7280;">This code is valid for 10 minutes. If you did not make this request, please secure your account credentials immediately.</p>
    </div>
  `;
  return sendEmail({ email, subject, text, html });
};
