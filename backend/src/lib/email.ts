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
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden;" id="email-container">
        <style>
          @media (prefers-color-scheme: dark) {
            #email-container { background-color: #1a1a2e !important; }
            .email-text { color: #e5e5e5 !important; }
            .email-secondary { color: #9ca3af !important; }
            .code-box { background-color: #374151 !important; }
            .email-divider { border-top-color: #374151 !important; }
            .email-footer { color: #9ca3af !important; }
          }
        </style>
        <div style="text-align: center; padding: 30px 20px 20px;">
          <picture>
            <source media="(prefers-color-scheme: dark)" srcset="${process.env.FRONTEND_URL || 'http://localhost:5173'}/logo2.png">
            <img src="${process.env.FRONTEND_URL || 'http://localhost:5173'}/logo.png" alt="Tracla Logo" style="height: 60px; width: auto;" />
          </picture>
        </div>
        <div style="padding: 0 30px 30px;">
          <p class="email-text" style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.5;">Hi ${fullName},</p>
          <p class="email-text" style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.5;">Thanks for signing up! Please verify your email address using the code below:</p>
          <div class="code-box" style="background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <h2 style="color: #6366F1; font-size: 32px; margin: 0; letter-spacing: 8px;">${code}</h2>
          </div>
          <p class="email-secondary" style="margin-top: 20px; font-size: 14px; line-height: 1.5;">This code expires in 24 hours. Enter it on the verification page to complete your registration.</p>
          <hr class="email-divider" style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p class="email-footer" style="font-size: 12px; margin: 0;">Tracla</p>
        </div>
      </div>
    `,
  });
};

export const sendPasswordResetEmail = async (email: string, fullName: string, code: string) => {
  await sendMail({
    to: email,
    subject: "Reset your Tracla password",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden;" id="email-container">
        <style>
          @media (prefers-color-scheme: dark) {
            #email-container { background-color: #1a1a2e !important; }
            .email-text { color: #e5e5e5 !important; }
            .email-secondary { color: #9ca3af !important; }
            .code-box { background-color: #374151 !important; }
            .email-divider { border-top-color: #374151 !important; }
            .email-footer { color: #9ca3af !important; }
          }
        </style>
        <div style="text-align: center; padding: 30px 20px 20px;">
          <picture>
            <source media="(prefers-color-scheme: dark)" srcset="${process.env.FRONTEND_URL || 'http://localhost:5173'}/logo2.png">
            <img src="${process.env.FRONTEND_URL || 'http://localhost:5173'}/logo.png" alt="Tracla Logo" style="height: 60px; width: auto;" />
          </picture>
        </div>
        <div style="padding: 0 30px 30px;">
          <p class="email-text" style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.5;">Hi ${fullName},</p>
          <p class="email-text" style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.5;">We received a request to reset your password. Use the code below to set a new one:</p>
          <div class="code-box" style="background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <h2 style="color: #6366F1; font-size: 32px; margin: 0; letter-spacing: 8px;">${code}</h2>
          </div>
          <p class="email-secondary" style="margin-top: 20px; font-size: 14px; line-height: 1.5;">This code expires in 1 hour. Enter it on the reset password page to continue. If you didn't request this, ignore this email.</p>
          <hr class="email-divider" style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p class="email-footer" style="font-size: 12px; margin: 0;">Tracla</p>
        </div>
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
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden;" id="email-container">
        <style>
          @media (prefers-color-scheme: dark) {
            #email-container { background-color: #1a1a2e !important; }
            .email-text { color: #e5e5e5 !important; }
            .email-secondary { color: #9ca3af !important; }
            .code-box { background-color: #374151 !important; }
            .email-divider { border-top-color: #374151 !important; }
            .email-footer { color: #9ca3af !important; }
            .details-label { color: #e5e5e5 !important; }
            .details-value { color: #9ca3af !important; }
          }
        </style>
        <div style="text-align: center; padding: 30px 20px 20px;">
          <picture>
            <source media="(prefers-color-scheme: dark)" srcset="${process.env.FRONTEND_URL || 'http://localhost:5173'}/logo2.png">
            <img src="${process.env.FRONTEND_URL || 'http://localhost:5173'}/logo.png" alt="Tracla Logo" style="height: 60px; width: auto;" />
          </picture>
        </div>
        <div style="padding: 0 30px 30px;">
          <p class="email-text" style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.5;">Hi ${fullName},</p>
          <p class="email-text" style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.5;">Use the code below to confirm your withdrawal request.</p>
          <div class="code-box" style="background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <h2 style="color: #6366F1; font-size: 32px; margin: 0; letter-spacing: 8px;">${code}</h2>
          </div>
          <p><strong class="details-label">Business:</strong> <span class="details-value">${details.businessName}</span></p>
          <p><strong class="details-label">Amount:</strong> <span class="details-value">NGN ${details.amount.toLocaleString()}</span></p>
          <p><strong class="details-label">Account number:</strong> <span class="details-value">${details.accountNumber}</span></p>
          <p class="email-secondary" style="margin-top: 20px; font-size: 14px; line-height: 1.5;">This code expires in 15 minutes. Enter it on your wallet page to submit the withdrawal for processing.</p>
          <hr class="email-divider" style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p class="email-footer" style="font-size: 12px; margin: 0;">Tracla</p>
        </div>
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
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden;" id="email-container">
        <style>
          @media (prefers-color-scheme: dark) {
            #email-container { background-color: #1a1a2e !important; }
            .email-text { color: #e5e5e5 !important; }
            .email-secondary { color: #9ca3af !important; }
            .payment-box { background-color: #064e3b !important; }
            .payment-amount { color: #34d399 !important; }
            .payment-label { color: #e5e5e5 !important; }
            .email-divider { border-top-color: #374151 !important; }
            .email-footer { color: #9ca3af !important; }
          }
        </style>
        <div style="text-align: center; padding: 30px 20px 20px;">
          <picture>
            <source media="(prefers-color-scheme: dark)" srcset="${process.env.FRONTEND_URL || 'http://localhost:5173'}/logo2.png">
            <img src="${process.env.FRONTEND_URL || 'http://localhost:5173'}/logo.png" alt="Tracla Logo" style="height: 60px; width: auto;" />
          </picture>
        </div>
        <div style="padding: 0 30px 30px;">
          <p class="email-text" style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.5;">Hi ${fullName},</p>
          <p class="email-text" style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.5;">Great news! You've received a new payment on your Tracla account.</p>
          <div class="payment-box" style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #16a34a; margin: 0 0 10px 0;">Payment Details:</h3>
            <p><strong class="payment-label">Amount:</strong> <span class="payment-amount" style="font-size: 18px;">NGN ${details.amount.toLocaleString()}</span></p>
            <p class="payment-label"><strong>Business:</strong> ${details.businessName}</p>
            ${details.customerName ? `<p class="payment-label"><strong>Customer:</strong> ${details.customerName}</p>` : ''}
            ${details.rating ? `<p class="payment-label"><strong>Rating:</strong> ${'★'.repeat(details.rating)} (${details.rating}/5)</p>` : ''}
          </div>
          <p class="email-secondary" style="margin-top: 20px; font-size: 14px; line-height: 1.5;">This payment has been added to your wallet balance and is available for withdrawal.</p>
          <p class="email-secondary" style="margin-top: 20px; font-size: 14px; line-height: 1.5;">Log in to your dashboard to view your updated balance and withdrawal history.</p>
          <hr class="email-divider" style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p class="email-footer" style="font-size: 12px; margin: 0;">Tracla - Instant Tips & Feedback</p>
        </div>
      </div>
    `,
  });
};

export const sendFeedbackNotificationEmail = async (
  email: string,
  fullName: string,
  details: { 
    businessName: string; 
    rating?: number; 
    experience?: string; 
    complaint?: string;
    customerPhone?: string;
    tipAmount?: number;
  }
) => {
  await sendMail({
    to: email,
    subject: "New feedback received on Tracla!",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden;" id="email-container">
        <style>
          @media (prefers-color-scheme: dark) {
            #email-container { background-color: #1a1a2e !important; }
            .email-text { color: #e5e5e5 !important; }
            .email-secondary { color: #9ca3af !important; }
            .rating-box { background-color: #451a03 !important; }
            .rating-title { color: #fbbf24 !important; }
            .rating-stars { color: #fbbf24 !important; }
            .feedback-box { background-color: #0c4a6e !important; }
            .feedback-title { color: #22d3ee !important; }
            .feedback-text { color: #e5e5e5 !important; }
            .complaint-box { background-color: #450a0a !important; }
            .complaint-title { color: #f87171 !important; }
            .complaint-text { color: #e5e5e5 !important; }
            .tip-box { background-color: #064e3b !important; }
            .tip-title { color: #34d399 !important; }
            .tip-amount { color: #34d399 !important; }
            .contact-box { background-color: #1f2937 !important; }
            .contact-title { color: #9ca3af !important; }
            .contact-text { color: #e5e5e5 !important; }
            .email-divider { border-top-color: #374151 !important; }
            .email-footer { color: #9ca3af !important; }
          }
        </style>
        <div style="text-align: center; padding: 30px 20px 20px;">
          <picture>
            <source media="(prefers-color-scheme: dark)" srcset="${process.env.FRONTEND_URL || 'http://localhost:5173'}/logo2.png">
            <img src="${process.env.FRONTEND_URL || 'http://localhost:5173'}/logo.png" alt="Tracla Logo" style="height: 60px; width: auto;" />
          </picture>
        </div>
        <div style="padding: 0 30px 30px;">
          <p class="email-text" style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.5;">Hi ${fullName},</p>
          <p class="email-text" style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.5;">You've received new feedback on your business "${details.businessName}".</p>
          
          ${details.rating ? `
          <div class="rating-box" style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 class="rating-title" style="margin: 0 0 10px 0;">Customer Rating:</h3>
            <p class="rating-stars" style="font-size: 24px; margin: 0;">${'★'.repeat(details.rating)}${'☆'.repeat(5 - details.rating)} (${details.rating}/5)</p>
          </div>
          ` : ''}
          
          ${details.experience ? `
          <div class="feedback-box" style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 class="feedback-title" style="margin: 0 0 10px 0;">Customer Feedback:</h3>
            <p class="feedback-text" style="margin: 0; line-height: 1.5;">${details.experience}</p>
          </div>
          ` : ''}
          
          ${details.complaint ? `
          <div class="complaint-box" style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 class="complaint-title" style="margin: 0 0 10px 0;">Customer Complaint:</h3>
            <p class="complaint-text" style="margin: 0; line-height: 1.5;">${details.complaint}</p>
          </div>
          ` : ''}
          
          ${details.tipAmount && details.tipAmount > 0 ? `
          <div class="tip-box" style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 class="tip-title" style="margin: 0 0 10px 0;">Tip Received:</h3>
            <p class="tip-amount" style="font-size: 18px; margin: 0;">NGN ${details.tipAmount.toLocaleString()}</p>
          </div>
          ` : ''}
          
          ${details.customerPhone ? `
          <div class="contact-box" style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 class="contact-title" style="margin: 0 0 10px 0;">Customer Contact:</h3>
            <p class="contact-text" style="margin: 0;">${details.customerPhone}</p>
          </div>
          ` : ''}
          
          <p class="email-secondary" style="margin-top: 20px; font-size: 14px; line-height: 1.5;">Log in to your dashboard to view all feedback and manage your business reputation.</p>
          <hr class="email-divider" style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p class="email-footer" style="font-size: 12px; margin: 0;">Tracla - Instant Tips & Feedback</p>
        </div>
      </div>
    `,
  });
};
