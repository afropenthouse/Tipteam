import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const hasSmtpConfig = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;

const transporter = hasSmtpConfig
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 5000,
    })
  : null;

async function sendMail(mailOptions: { to: string; subject: string; html: string }) {
  if (!transporter) {
    console.warn("SMTP not configured - skipping email send");
    return;
  }
  try {
    await transporter.sendMail({
      from: process.env.FROM_EMAIL || process.env.SMTP_USER,
      ...mailOptions,
    });
  } catch (error) {
    console.error("Failed to send email:", error);
  }
}

export const sendVerificationEmail = async (email: string, fullName: string, code: string) => {
  await sendMail({
    to: email,
    subject: "Verify your Tracla account",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #6366F1;">Tracla</h1>
        <p>Hi ${fullName},</p>
        <p>Thanks for signing up! Please verify your email address using the code below:</p>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
          <h2 style="color: #6366F1; font-size: 32px; margin: 0; letter-spacing: 8px;">${code}</h2>
        </div>
        <p style="margin-top: 20px; color: #666;">This code expires in 24 hours. Enter it on the verification page to complete your registration.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="color: #999; font-size: 12px;">Tracla</p>
      </div>
    `,
  });
};

export const sendPasswordResetEmail = async (email: string, fullName: string, code: string) => {
  await sendMail({
    to: email,
    subject: "Reset your Tracla password",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #6366F1;">Tracla</h1>
        <p>Hi ${fullName},</p>
        <p>We received a request to reset your password. Use the code below to set a new one:</p>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
          <h2 style="color: #6366F1; font-size: 32px; margin: 0; letter-spacing: 8px;">${code}</h2>
        </div>
        <p style="margin-top: 20px; color: #666;">This code expires in 1 hour. Enter it on the reset password page to continue. If you didn't request this, ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="color: #999; font-size: 12px;">Tracla</p>
      </div>
    `,
  });
};

export const sendWithdrawalVerificationEmail = async (
  email: string,
  fullName: string,
  code: string,
  details: { amount: number; businessName: string; accountNumber: string }
) => {
  await sendMail({
    to: email,
    subject: "Confirm your Tracla withdrawal",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #6366F1;">Tracla</h1>
        <p>Hi ${fullName},</p>
        <p>Use the code below to confirm your withdrawal request.</p>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
          <h2 style="color: #6366F1; font-size: 32px; margin: 0; letter-spacing: 8px;">${code}</h2>
        </div>
        <p><strong>Business:</strong> ${details.businessName}</p>
        <p><strong>Amount:</strong> NGN ${details.amount.toLocaleString()}</p>
        <p><strong>Account number:</strong> ${details.accountNumber}</p>
        <p style="margin-top: 20px; color: #666;">This code expires in 15 minutes. Enter it on your wallet page to submit the withdrawal for processing.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="color: #999; font-size: 12px;">Tracla</p>
      </div>
    `,
  });
};

export const sendPaymentReceivedEmail = async (
  email: string,
  fullName: string,
  details: { amount: number; customerName?: string; businessName: string; rating?: number }
) => {
  await sendMail({
    to: email,
    subject: "You've received a payment on Tracla!",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #6366F1;">Tracla</h1>
        <p>Hi ${fullName},</p>
        <p>Great news! You've received a new payment on your Tracla account.</p>
        <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #16a34a; margin: 0 0 10px 0;">Payment Details:</h3>
          <p><strong>Amount:</strong> <span style="color: #16a34a; font-size: 18px;">NGN ${details.amount.toLocaleString()}</span></p>
          <p><strong>Business:</strong> ${details.businessName}</p>
          ${details.customerName ? `<p><strong>Customer:</strong> ${details.customerName}</p>` : ''}
          ${details.rating ? `<p><strong>Rating:</strong> ${'★'.repeat(details.rating)} (${details.rating}/5)</p>` : ''}
        </div>
        <p style="margin-top: 20px; color: #666;">This payment has been added to your wallet balance and is available for withdrawal.</p>
        <p style="margin-top: 20px; color: #666;">Log in to your dashboard to view your updated balance and withdrawal history.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="color: #999; font-size: 12px;">Tracla - Instant Tips & Feedback</p>
      </div>
    `,
  });
};
