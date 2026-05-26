import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    type: "OAuth2",
    user: process.env.EMAIL_USER,
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    refreshToken: process.env.REFRESH_TOKEN,
  },
});

transporter.verify((error, success) => {
  if (error) {
    console.error("Error connecting to email server:", error);
  } else {
    console.log("Email server is ready to send messages");
  }
});

const sendEmail = async (to, subject, html) => {
  try {
    await transporter.sendMail({
      from: `"Collaborative Real Timw WorkBoard Meeting App" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
  } catch (error) {
    console.error("Error sending email:", error);
  }
};

export const sendVerificationEmail = async (to, name, verificationUrl) => {
  const subject = "Verify Your Email Address";
  const html = `
    <div style="background-color: #f8fafc; padding: 40px 20px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; min-height: 100%; color: #1e293b; margin: 0;">
      <div style="max-width: 540px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(37, 99, 235, 0.05), 0 8px 16px -6px rgba(37, 99, 235, 0.05);">
        
        <!-- Top Accent Bar -->
        <div style="height: 6px; background-color: #2563eb;"></div>
        
        <div style="padding: 40px 35px;">
          <!-- Logo / Header -->
          <div style="text-align: center; margin-bottom: 30px;">
            <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto; border-collapse: collapse;">
              <tr>
                <td align="center" valign="middle" style="width: 56px; height: 56px; background-color: #eff6ff; border-radius: 12px; text-align: center; vertical-align: middle;">
                  <span style="font-size: 28px; color: #2563eb; line-height: 56px; display: block; margin: 0; padding: 0;">✉️</span>
                </td>
              </tr>
            </table>
            <h2 style="font-size: 22px; font-weight: 700; color: #1e293b; margin: 16px 0 0 0; tracking-tight: -0.025em;">Verify Your Email Address</h2>
            <p style="font-size: 14px; color: #475569; margin: 8px 0 0 0;">Welcome to Workspace</p>
          </div>
          
          <!-- Content Body -->
          <p style="font-size: 15px; line-height: 1.6; color: #1e293b; margin-top: 0; margin-bottom: 16px;">Hello <strong>${name}</strong>,</p>
          <p style="font-size: 15px; line-height: 1.6; color: #475569; margin-top: 0; margin-bottom: 24px;">Thank you for signing up! We are excited to help you start collaborating. To activate your account and access your workspace, please verify your email address by clicking the button below. This link is valid for <strong>24 hours</strong>.</p>
          
          <!-- CTA Button -->
          <div style="text-align: center; margin: 32px 0;">
            <a href="${verificationUrl}" style="background-color: #2563eb; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2), 0 2px 4px -1px rgba(37, 99, 235, 0.1);">Confirm Email Address</a>
          </div>
          
          <!-- Troubleshooting Box -->
          <div style="border-top: 1px solid #e2e8f0; margin-top: 32px; padding-top: 24px;">
            <p style="font-size: 13px; line-height: 1.5; color: #475569; margin-top: 0; margin-bottom: 12px;">If you're having trouble with the button above, copy and paste this link into your browser:</p>
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; word-break: break-all; text-align: center;">
              <a href="${verificationUrl}" style="color: #2563eb; text-decoration: none; font-size: 13px; font-family: 'JetBrains Mono', Consolas, Monaco, monospace; font-weight: 500;">${verificationUrl}</a>
            </div>
          </div>
          
          <p style="font-size: 13px; color: #94a3b8; margin-top: 24px; margin-bottom: 0; line-height: 1.5;">If you did not sign up for a CollabFlow account, you can safely ignore this email.</p>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px 35px; text-align: center;">
          <p style="font-size: 12px; color: #94a3b8; margin: 0; line-height: 1.5;">This is an automated system email. Please do not reply directly to this message.</p>
          <p style="font-size: 12px; color: #94a3b8; margin: 6px 0 0 0; font-weight: 500;">&copy; 2026 CollabFlow. All rights reserved.</p>
        </div>
        
      </div>
    </div>
  `;

  await sendEmail(to, subject, html);
};
