import crypto from 'crypto';
import { getFirebaseAdmin, readRequestBody, jsonError, jsonSuccess, sendBrevoEmail } from './_shared.js';

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
    const adminAuth = admin.auth();

    step = 'request_parse';
    const body = await readRequestBody(req);
    const token = typeof body.token === 'string' ? body.token.trim() : '';
    const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';

    if (!token) {
      return jsonError(res, 400, 'request_validation', 'Reset token is required.');
    }
    if (!newPassword || newPassword.length < 8) {
      return jsonError(res, 400, 'request_validation', 'New password must be at least 8 characters.');
    }

    step = 'token_lookup';
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const tokenRef = db.collection('password_reset_tokens').doc(hashedToken);
    const tokenSnap = await tokenRef.get();
    if (!tokenSnap.exists) {
      return jsonError(res, 400, 'token_lookup', 'This reset link is invalid or has already been used.');
    }

    const tokenData = tokenSnap.data() || {};
    if (tokenData.used) {
      return jsonError(res, 400, 'token_lookup', 'This reset link has already been used. Please request a new one.');
    }

    const expiresAtSeconds = tokenData.expiresAt?.seconds;
    if (!Number.isFinite(expiresAtSeconds)) {
      return jsonError(res, 500, 'token_lookup', 'Stored password reset token is invalid.');
    }

    step = 'token_expiry_check';
    const now = admin.firestore.Timestamp.now();
    if (expiresAtSeconds < now.seconds) {
      await tokenRef.delete();
      return jsonError(res, 400, 'token_expiry_check', 'This reset link has expired. Please request a new password reset.');
    }

    const uid = tokenData.uid;
    const email = tokenData.email || '';
    if (!uid) {
      return jsonError(res, 500, 'token_lookup', 'Reset token is missing a user id.');
    }

    step = 'password_update';
    await adminAuth.updateUser(uid, { password: newPassword });

    step = 'token_invalidate';
    await tokenRef.delete();

    const brevoApiKey = process.env.BREVO_API_KEY;
    const senderEmail = process.env.BREVO_SENDER_EMAIL || 'keithciceron2004@gmail.com';
    if (brevoApiKey && email && senderEmail.includes('@')) {
      try {
        const userSnap = await db.collection('users').doc(uid).get();
        const fullName = userSnap.exists ? (userSnap.data()?.full_name || email.split('@')[0]) : email.split('@')[0];
        const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>Password Changed - JPCS Portal</title>
          </head>
          <body style="font-family: Arial, sans-serif; background:#f7f9fc; color:#334155; padding:24px;">
            <div style="max-width:600px; margin:0 auto; background:#fff; border:1px solid #e2e8f0; border-radius:16px; overflow:hidden;">
              <div style="background:#8b1e24; color:#fff; padding:32px; text-align:center;">
                <h1 style="margin:0; font-size:24px;">JPCS Portal</h1>
              </div>
              <div style="padding:40px 32px;">
                <p style="font-size:18px; font-weight:700; margin:0 0 12px;">Hello, ${fullName}!</p>
                <p style="line-height:1.6; margin:0;">
                  Your password has been successfully changed.
                </p>
              </div>
            </div>
          </body>
          </html>
        `;

        await sendBrevoEmail({
          apiKey: brevoApiKey,
          senderEmail,
          senderName: 'JPCS Portal',
          recipients: [{ email, name: fullName }],
          subject: 'Your password has been changed - JPCS Portal',
          htmlContent,
        });
      } catch (emailErr) {
        console.warn('Password change confirmation email failed:', emailErr?.message || emailErr);
      }
    }

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
