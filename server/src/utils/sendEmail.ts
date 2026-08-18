import nodemailer from 'nodemailer';
import { env } from '../config/env';

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: false,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!env.SMTP_USER) {
    console.log('Email not sent (no SMTP config):', subject);
    return false;
  }

  try {
    await transporter.sendMail({
      from: `"CoreConnect" <${env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
    return true;
  } catch (error) {
    console.error('Email send error:', error);
    return false;
  }
}

export function orderConfirmationEmail(orderNumber: string, total: string, items: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #0F172A; color: white; padding: 24px; text-align: center;">
        <h1 style="margin: 0;">CoreConnect</h1>
      </div>
      <div style="padding: 24px; background: #F8FAFC;">
        <h2>Order Confirmed!</h2>
        <p>Your order <strong>#${orderNumber}</strong> has been placed successfully.</p>
        <h3>Order Summary</h3>
        ${items}
        <p style="font-weight: bold; font-size: 18px;">Total: $${total}</p>
        <p>We'll notify you when your order ships. Track your order anytime from your account.</p>
      </div>
    </div>
  `;
}
