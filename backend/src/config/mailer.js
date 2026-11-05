import nodemailer from 'nodemailer';

export function createMailer(env = process.env) {
  const port = Number(env.EMAIL_PORT) || 587;
  // Signup and password recovery both depend on outbound mail. Without it the
  // API still answers 202 and the user simply never receives a code, so make the
  // misconfiguration loud at boot rather than silent.
  if (!env.EMAIL_USER || !env.EMAIL_PASS) {
    console.warn(
      'Email is not configured (EMAIL_USER / EMAIL_PASS are empty): verification and '
      + 'password-recovery codes cannot be delivered, and signup will not complete.'
    );
  }
  const transporter = nodemailer.createTransport({
    host: env.EMAIL_HOST || 'smtp.gmail.com',
    port,
    // Port 465 is implicit TLS and requires secure:true; 587 upgrades via STARTTLS.
    secure: port === 465,
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
    auth: {
      user: env.EMAIL_USER,
      pass: env.EMAIL_PASS,
    },
  });

  const shell = (body) => `
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:480px;margin:0 auto;background:#f0f4ff;border-radius:16px;padding:40px 36px;">
      <div style="text-align:center;margin-bottom:28px;">
        <h1 style="font-size:28px;color:#0f1b3d;margin:0;font-weight:700;">ACM ITU</h1>
        <p style="color:#5b8ff0;margin:4px 0 0;font-size:14px;font-weight:600;letter-spacing:0.05em;">STUDENT CHAPTER</p>
      </div>
      <div style="background:#ffffff;border-radius:12px;padding:32px 28px;text-align:center;box-shadow:0 4px 20px rgba(58,99,201,0.10);">
        ${body}
      </div>
      <p style="text-align:center;color:#aaa;font-size:12px;margin-top:24px;">
        © ACM ITU Student Chapter
      </p>
    </div>
  `;

  return {
    async sendOtp(to, code) {
      await transporter.sendMail({
        from: env.EMAIL_FROM || `ACM ITU <${env.EMAIL_USER}>`,
        to,
        subject: 'Your ACM ITU Verification Code',
        html: shell(`
          <p style="color:#0f1b3d;font-size:16px;margin:0 0 24px;line-height:1.6;">
            Use the code below to verify your email address. It expires in <strong>15 minutes</strong>.
          </p>
          <div style="background:#f0f4ff;border-radius:12px;padding:20px 32px;display:inline-block;letter-spacing:0.18em;font-size:36px;font-weight:700;color:#3a63c9;font-family:'Courier New',monospace;">
            ${code}
          </div>
          <p style="color:#888;font-size:13px;margin:24px 0 0;">
            If you didn't create an ACM ITU account, you can safely ignore this email.
          </p>
        `),
      });
    },

    /**
     * Sent when someone tries to register with an address that already has an
     * account. Keeps signup from leaking which addresses are registered while
     * still telling the real owner what happened.
     */
    async sendAccountExists(to) {
      await transporter.sendMail({
        from: env.EMAIL_FROM || `ACM ITU <${env.EMAIL_USER}>`,
        to,
        subject: 'Your ACM ITU account already exists',
        html: shell(`
          <p style="color:#0f1b3d;font-size:16px;margin:0 0 20px;line-height:1.6;">
            Someone just tried to create an ACM ITU account with this email address, but an account already exists.
          </p>
          <p style="color:#0f1b3d;font-size:15px;margin:0 0 20px;line-height:1.6;">
            If that was you, sign in instead — or use “Forgot password” on the sign-in page to set a new password.
          </p>
          <p style="color:#888;font-size:13px;margin:0;">
            If that wasn't you, no action is needed and your account is unchanged.
          </p>
        `),
      });
    },
  };
}
