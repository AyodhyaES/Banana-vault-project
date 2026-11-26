// Sends the email verification code.
// If email is not set up in .env, the code is printed in the server terminal
// instead ("practice mode") and no real email is sent.
const nodemailer = (() => {
  try { return require('nodemailer'); } catch (e) { return null; }   // npm install nodemailer
})();

// purpose: 'signup' (confirm the email) or 'login' (the one-time code at every login)
const TEXTS = {
  signup: { subject: 'Your Banana Mystery Vault verification code', lead: 'Your verification code is' },
  login:  { subject: 'Your Banana Mystery Vault login code',        lead: 'Your login code is' }
};

async function sendCode(to, username, code, minutes, purpose = 'signup') {
  const T = TEXTS[purpose] || TEXTS.signup;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM } = process.env;

  // Practice mode: no email settings (or nodemailer not installed)
  if (!nodemailer || !SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.log(`[EMAIL PRACTICE MODE] ${T.subject} for ${username} <${to}>: ${code}`);
    return { sent: false };
  }

  const port = Number(SMTP_PORT || 587);
  const transport = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,          // 465 = SSL, 587 = STARTTLS
    auth: { user: SMTP_USER, pass: SMTP_PASS }
  });

  await transport.sendMail({
    from: MAIL_FROM || SMTP_USER,
    to,
    subject: T.subject,
    text:
      `Hi ${username},\n\n` +
      `${T.lead}: ${code}\n\n` +
      `It works for ${minutes} minutes. If this was not you, ignore this email.\n\n` +
      `Banana Mystery Vault`,
    html:
      `<div style="font-family:Georgia,serif;max-width:420px;margin:auto;padding:24px;` +
      `border:2px solid #f7c33c;border-radius:16px;background:#0b1433;color:#f4ecd8;text-align:center">` +
      `<h2 style="color:#f7c33c;margin:0 0 8px">🍌 Banana Mystery Vault</h2>` +
      `<p>Hi ${username}, ${T.lead.charAt(0).toLowerCase() + T.lead.slice(1)}:</p>` +
      `<p style="font-size:2rem;letter-spacing:.3em;font-weight:bold;color:#f7c33c;margin:12px 0">${code}</p>` +
      `<p style="color:#a89bb8;font-size:.9rem">It works for ${minutes} minutes.<br>` +
      `If this was not you, ignore this email.</p></div>`
  });

  return { sent: true };
}

module.exports = { sendCode };