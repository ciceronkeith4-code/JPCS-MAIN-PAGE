import crypto from 'crypto';
import {
  getFirebaseAdmin,
  getBaseUrl,
  readRequestBody,
  jsonError,
  jsonSuccess,
  sendBrevoEmail,
} from './_shared.js';

export default async function handler(req, res) {
  let step = 'bootstrap';

  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version',
  );

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
    const uid = typeof body.uid === 'string' ? body.uid.trim() : '';
    const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : '';

    if (!email || !email.includes('@') || !uid || !fullName) {
      return jsonError(
        res,
        400,
        'request_validation',
        'Missing required parameters: email, uid, or fullName.',
      );
    }

    const brevoApiKey = process.env.BREVO_API_KEY;
    const senderEmail = process.env.BREVO_SENDER_EMAIL || 'keithciceron2004@gmail.com';
    if (!brevoApiKey) {
      return jsonError(res, 503, 'environment', 'BREVO_API_KEY is not configured.');
    }
    if (!senderEmail.includes('@')) {
      return jsonError(res, 503, 'environment', 'BREVO_SENDER_EMAIL is not configured.');
    }

    step = 'token_generate';
    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    step = 'firestore_write';
    await db.collection('verification_tokens').doc(hashedToken).set({
      uid,
      email,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
      verified: false,
    });

    step = 'email_build';
    const verificationUrl = `${getBaseUrl(req)}/verify-email?token=${token}`;
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Verify Your Email - JPCS Portal</title>
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
              Thank you for registering. Click the button below to verify your email address and activate your account.
            </p>
            <p style="text-align:center; margin:32px 0;">
              <a href="${verificationUrl}" style="display:inline-block; padding:14px 32px; background:#8b1e24; color:#fff; text-decoration:none; border-radius:12px; font-weight:700;">
                Verify My Email
              </a>
            </p>
            <p style="font-size:12px; color:#64748b; line-height:1.6;">
              This verification link expires in 24 hours. If the button does not work, copy and paste this URL into your browser:
            </p>
            <p style="word-break:break-all; background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:16px; font-family:monospace; font-size:12px; color:#64748b;">
              ${verificationUrl}
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
      subject: 'Verify your email address - JPCS Portal',
      htmlContent,
    });

    return jsonSuccess(res);
  } catch (err) {
    return jsonError(
      res,
      500,
      step,
      err?.message || 'An unexpected error occurred.',
      err,
      {
        environment: {
          brevoConfigured: !!process.env.BREVO_API_KEY,
          senderConfigured: !!process.env.BREVO_SENDER_EMAIL,
          firebaseServiceAccountConfigured: !!process.env.FIREBASE_SERVICE_ACCOUNT,
        },
      },
    );
  }
}
