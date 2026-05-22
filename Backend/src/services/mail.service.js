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
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="color: #4f46e5; text-align: center;">Collaborative Whiteboard Platform</h2>
      <p>Hello <strong>${name}</strong>,</p>
      <p>Thank you for signing up! Please verify your email address to activate your account. This verification link is valid for 24 hours.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${verificationUrl}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Verify My Email</a>
      </div>
      <p>If the button doesn't work, copy and paste this URL into your browser:</p>
      <p><a href="${verificationUrl}">${verificationUrl}</a></p>
      <p>If you didn't request this email, you can safely ignore it.</p>
      <hr style="border: 0; border-top: 1px solid #e0e0e0; margin: 20px 0;" />
      <p style="font-size: 12px; color: #666; text-align: center;">This is an automated system email. Please do not reply.</p>
    </div>
  `;

  await sendEmail(to, subject, html);
};
