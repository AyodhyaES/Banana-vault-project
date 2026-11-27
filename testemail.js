// Sends the one-time codes by email (Nodemailer).
//
// If email is not set up in .env, the code is printed in the server terminal instead
// ("practice mode") and NO real email is sent. The terminal always says why.
const nodemailer = (() => {
  try { return require('nodemailer'); } catch (e) { return null; }   // npm install nodemailer
})();

// purpose: 'signup' (confirm the email) or 'login' (the one-time code at every login)
const TEXTS = {
  signup: { subject: 'Your Banana Mystery Vault verification code', lead: 'Your verification code is' },
  login:  { subject: 'Your Banana Mystery Vault login code',        lead: 'Your login code is' }
};

// What is still missing for real emails? (empty list = ready)
const missing = () => {
  const { SMTP_HOST, SMTP_USER, SMTP_PASS } = process.env;
  const m = [];
  if (!nodemailer) m.push('the nodemailer package (run: npm install nodemailer)');
  if (!SMTP_HOST) m.push('SMTP_HOST in the .env file');
  if (!SMTP_USER) m.push('SMTP_USER in the .env file');
  if (!SMTP_PASS) m.push('SMTP_PASS in the .env file');
  return m;
};

// A friendly hint for the most common email problems
const hint = err => {
  const code = err && err.code;
  const msg = String((err && err.message) || '');

  if (code === 'EAUTH' || /535|Invalid login|not accepted|BadCredentials/i.test(msg))
    return 'The email server refused the login. For Gmail use an APP PASSWORD ' +
           '(16 letters; turn on 2-Step Verification first), not your normal password. ' +
           'Write it in SMTP_PASS without spaces.';

  if (['ESOCKET', 'ECONNECTION', 'ETIMEDOUT', 'EDNS'].includes(code) || /ENOTFOUND|ECONNREFUSED|ETIMEDOUT/i.test(msg))
    return 'Cannot reach the email server. Check SMTP_HOST (Gmail: smtp.gmail.com), ' +
           'SMTP_PORT (587) and your internet, VPN or firewall.';

  if (code === 'EENVELOPE' || /recipient|invalid.*address/i.test(msg))
    return 'The receiving email address is not valid.';

  if (/self.signed|certificate/i.test(msg))
    return 'The connection is blocked by a certificate problem (antivirus or school network).';

  return '';
};

const makeTransport = () => {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  const port = Number(SMTP_PORT || 587);

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,            // 465 = SSL, 587 = STARTTLS
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    connectionTimeout: 10000,        // do not wait forever
    greetingTimeout: 10000,
    socketTimeout: 15000
  });
};

// Prints in the terminal whether real emails will work (called when the server starts)
async function status() {
  const m = missing();

  if (m.length) {
    console.log(
      '[EMAIL] PRACTICE MODE - no real emails are sent. Codes are printed in this terminal.\n' +
      '        Missing: ' + m.join('; ') + '.\n' +
      '        Fix it, then stop and start the server again.'
    );
    return { ok: false, practice: true };
  }

  try {
    await makeTransport().verify();
    console.log('[EMAIL] Ready - emails are sent as ' +
      (process.env.MAIL_FROM || process.env.SMTP_USER) + ' through ' + process.env.SMTP_HOST);
    return { ok: true };
  } catch (e) {
    console.error('[EMAIL] Cannot use the email server: ' + e.message + '\n        ' +
      (hint(e) || 'Check the SMTP_* settings in the .env file.'));
    return { ok: false };
  }
}

async function sendCode(to, username, code, minutes, purpose = 'signup') {
  const T = TEXTS[purpose] || TEXTS.signup;
  const m = missing();

  // Practice mode: print the code in the terminal and say why no email was sent
  if (m.length) {
    console.log(`[EMAIL PRACTICE MODE - not emailed, missing ${m[0]}] ` +
                `${T.subject} for ${username} <${to}>: ${code}`);
    return { sent: false };
  }

  try {
    await makeTransport().sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
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
  } catch (e) {
    const h = hint(e);
    if (h) e.message += '  ->  ' + h;     // the reason appears in the server terminal
    throw e;
  }

  return { sent: true };
}

module.exports = { sendCode, status, missing, hint };