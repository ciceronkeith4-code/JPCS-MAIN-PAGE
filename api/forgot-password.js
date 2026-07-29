import crypto from 'crypto';
import { getFirebaseAdmin, getBaseUrl, readRequestBody, jsonError, jsonSuccess, sendBrevoEmail } from './_shared.js';

const rateLimitCache = new Map();

function checkRateLimit(email) {
  const now = Date.now();
  const key = email.trim().toLowerCase();
  const record = rateLimitCache.get(key) || { count: 0, windowStart: now };

  if (now - record.windowStart > 60 * 60 * 1000) {
    record.count = 0;
    record.windowStart = now;
  }

  if (record.count >= 3) {
    return false;
  }

  record.count += 1;
  rateLimitCache.set(key, record);
  return true;
}

export default async function handler(req, res) {
  let step = 'bootstrap';

  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return jsonError(res, 405, 'method', 'Method not allowed.');
  }

  try {
    step = 'firebase_admin_init';
    const admin = getFirebaseAdmin();
    const db = admin.firestore();

    step = 'request_parse';
    const body = await readRequestBody(req);
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!email || !email.includes('@')) {
      return jsonError(res, 400, 'request_validation', 'A valid email address is required.');
    }

    if (!checkRateLimit(email)) {
      return jsonError(res, 429, 'rate_limit', 'Too many requests. Please wait before requesting another reset link.');
    }

    step = 'user_lookup';
    const usersSnap = await db.collection('users').where('email', '==', email).limit(1).get();
    if (usersSnap.empty) {
      return jsonSuccess(res);
    }

    const userDoc = usersSnap.docs[0];
    const userData = userDoc.data() || {};
    const uid = userData.id || userDoc.id;

    step = 'token_generate';
    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    step = 'token_write';
    const existingTokens = await db.collection('password_reset_tokens').where('uid', '==', uid).get();
    const batch = db.batch();
    existingTokens.forEach((doc) => batch.delete(doc.ref));
    batch.set(db.collection('password_reset_tokens').doc(hashedToken), {
      uid,
      email,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
      used: false,
    });
    await batch.commit();

    step = 'email_build';
    const fullName = userData.full_name || email.split('@')[0];
    const resetUrl = `${getBaseUrl(req)}/reset-password?token=${token}`;
    const brevoApiKey = process.env.BREVO_API_KEY;
    const senderEmail = process.env.BREVO_SENDER_EMAIL || 'keithciceron2004@gmail.com';
    if (!brevoApiKey) {
      return jsonError(res, 503, 'environment', 'BREVO_API_KEY is not configured.');
    }
    if (!senderEmail.includes('@')) {
      return jsonError(res, 503, 'environment', 'BREVO_SENDER_EMAIL is not configured.');
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Reset Your Password - JPCS Portal</title>
      </head>
      <body style="font-family: Arial, sans-serif; background:#f7f9fc; color:#334155; padding:24px;">
        <div style="max-width:600px; margin:0 auto; background:#fff; border:1px solid #e2e8f0; border-radius:16px; overflow:hidden;">
          <div style="background:#8b1e24; color:#fff; padding:32px; text-align:center;">
            <h1 style="margin:0; font-size:24px;">JPCS Portal</h1>
            <p style="margin:6px 0 0; font-size:13px;">San Sebastian College - Recoletos Manila</p>
          </div>
          <div style="padding:40px 32px;">
            <p style="font-size:18px; font-weight:700; margin:0 0 12px;">Hello, ${fullName}!</p>
            <p style="line-height:1.6; margin:0 0 24px;">
              We received a request to reset the password for your JPCS Portal account.
            </p>
            <p style="text-align:center; margin:32px 0;">
              <a href="${resetUrl}" style="display:inline-block; padding:14px 32px; background:#8b1e24; color:#fff; text-decoration:none; border-radius:12px; font-weight:700;">
                Reset My Password
              </a>
            </p>
            <p style="font-size:12px; color:#64748b; line-height:1.6;">
              This link expires in 1 hour. If you did not request a password reset, you can ignore this email.
            </p>
            <p style="word-break:break-all; background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:16px; font-family:monospace; font-size:12px; color:#64748b;">
              ${resetUrl}
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    step = 'brevo_send';
    await sendBrevoEmail({
      apiKey: brevoApiKey,
      senderEmail,
      senderName: 'JPCS Portal',
      recipients: [{ email, name: fullName }],
      subject: 'Reset your password - JPCS Portal',
      htmlContent,
    });

    return jsonSuccess(res);
  } catch (err) {
    return jsonError(res, 500, step, err?.message || 'An unexpected error occurred.', err, {
      environment: {
        brevoConfigured: !!process.env.BREVO_API_KEY,
        senderConfigured: !!process.env.BREVO_SENDER_EMAIL,
        firebaseServiceAccountConfigured: !!process.env.FIREBASE_SERVICE_ACCOUNT,
      },
    });
  }
}
