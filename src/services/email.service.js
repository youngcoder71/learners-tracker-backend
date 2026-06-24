const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "sandbox.smtp.mailtrap.io",
  port: 2525,
  auth: {
    user: "0edef83994f8bd",
    pass: "97b1b8a8fbdfe6",
  },
});

const sendPasswordEmail = async (to, password) => {
  const info = await transporter.sendMail({
    from: '"Learner Tracking System" <noreply@learnertracker.com>',
    to: to,
    subject: "Welcome to Learner Tracking System - Your Account Details",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 550px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.1);">
        <div style="background: #ff6b00; padding: 30px 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">🎓 Learner Tracking System</h1>
        </div>
        <div style="padding: 32px 24px;">
          <h2 style="color: #333; font-size: 20px; margin-bottom: 16px;">Welcome aboard! 🎉</h2>
          <p style="color: #555; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
            Your account has been created by the administrator. You can now log in to the system using the credentials below.
          </p>
          
          <div style="background: #f5f5f5; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
            <p style="color: #888; font-size: 13px; margin: 0 0 8px 0;">YOUR PASSWORD</p>
            <p style="font-size: 28px; font-weight: 700; letter-spacing: 3px; color: #ff6b00; margin: 0; font-family: 'Courier New', monospace;">
              ${password}
            </p>
          </div>
          
          <div style="text-align: center; margin-bottom: 24px;">
            <a href="http://localhost:5173" style="background: #ff6b00; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 600; display: inline-block;">
              🔗 Go to Login Page
            </a>
          </div>
          
          <p style="color: #888; font-size: 13px; text-align: center; margin-bottom: 8px;">
            Website: <a href="http://localhost:5173" style="color: #ff6b00;">http://localhost:5173</a>
          </p>
          <p style="color: #888; font-size: 13px; text-align: center;">
            Use your email and the password above to sign in.
          </p>
          
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 24px 0;" />
          
          <p style="color: #e53935; font-size: 12px; text-align: center; margin: 0;">
            ⚠️ Keep this password safe. Do not share it with anyone.
          </p>
        </div>
        <div style="background: #fafafa; padding: 16px 24px; text-align: center;">
          <p style="color: #aaa; font-size: 11px; margin: 0;">
            This is an automated message from Learner Tracking System.
          </p>
        </div>
      </div>
    `,
  });
  console.log("Password email sent:", info.messageId);
  return info;
};

const sendResetEmail = async (to, resetLink) => {
  const info = await transporter.sendMail({
    from: '"Learner Tracking System" <noreply@learnertracker.com>',
    to: to,
    subject: "Password Reset - Learner Tracking System",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 550px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.1);">
        <div style="background: #ff6b00; padding: 30px 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">🔑 Password Reset</h1>
        </div>
        <div style="padding: 32px 24px;">
          <h2 style="color: #333; font-size: 20px; margin-bottom: 16px;">Reset Your Password</h2>
          <p style="color: #555; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
            You requested a password reset. Click the button below to create a new password.
          </p>
          <div style="text-align: center; margin-bottom: 24px;">
            <a href="${resetLink}" style="background: #ff6b00; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 600; display: inline-block;">
              🔗 Reset Password
            </a>
          </div>
          <p style="color: #888; font-size: 13px; text-align: center;">
            This link expires in 30 minutes.
          </p>
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 24px 0;" />
          <p style="color: #aaa; font-size: 12px; text-align: center; margin: 0;">
            If you didn't request this, please ignore this email.
          </p>
        </div>
      </div>
    `,
  });
  console.log("Reset email sent:", info.messageId);
  return info;
};

module.exports = { sendPasswordEmail, sendResetEmail };