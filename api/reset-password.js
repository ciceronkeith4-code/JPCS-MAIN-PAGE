import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  let credential;
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    credential = admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT));
  } else {
    const saPath = path.resolve(process.cwd(), 'service-account.json');
    if (fs.existsSync(saPath)) {
      const sa = JSON.parse(fs.readFileSync(saPath, 'utf8'));
      credential = admin.credential.cert(sa);
    } else {
      credential = admin.credential.applicationDefault();
    }
  }
  admin.initializeApp({ credential });
}

const db = admin.firestore();
const adminAuth = admin.auth();

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { token, newPassword } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Reset token is required.' });
    }
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters.' });
    }

    // Hash the token to look up Firestore record
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const tokenRef = db.collection('password_reset_tokens').doc(hashedToken);
    const tokenSnap = await tokenRef.get();

    if (!tokenSnap.exists) {
      console.warn('Invalid or already-used reset token attempted.');
      return res.status(400).json({ error: 'This reset link is invalid or has already been used.' });
    }

    const tokenData = tokenSnap.data();

    // Check if already used
    if (tokenData.used) {
      return res.status(400).json({ error: 'This reset link has already been used. Please request a new one.' });
    }

    // Check expiration (1 hour)
    const now = admin.firestore.Timestamp.now();
    if (tokenData.expiresAt.seconds < now.seconds) {
      await tokenRef.delete();
      console.warn(`Expired reset token for UID: ${tokenData.uid}`);
      return res.status(400).json({ error: 'This reset link has expired. Please request a new password reset.' });
    }

    const { uid, email } = tokenData;

    // Update password using Firebase Admin SDK (server-side only)
    await adminAuth.updateUser(uid, { password: newPassword });
    console.log(`Password successfully updated for UID: ${uid}`);

    // Invalidate the token (one-time use)
    await tokenRef.delete();
    console.log(`Reset token deleted for UID: ${uid}`);

    // Send confirmation email via Brevo
    const brevoApiKey = process.env.BREVO_API_KEY;
    const senderEmail = process.env.BREVO_SENDER_EMAIL || 'keithciceron2004@gmail.com';

    if (brevoApiKey && email) {
      try {
        const userSnap = await db.collection('users').doc(uid).get();
        const fullName = userSnap.exists ? (userSnap.data().full_name || email.split('@')[0]) : email.split('@')[0];

        const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>Password Changed – JPCS Portal</title>
            <style>
              body { font-family: 'Segoe UI', sans-serif; background-color: #f7f9fc; margin: 0; padding: 0; color: #334155; }
              .container { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; }
              .header { background-color: #8b1e24; padding: 32px; text-align: center; color: #fff; }
              .header h1 { margin: 0; font-size: 22px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; }
              .content { padding: 32px; }
              .body-text { font-size: 14px; line-height: 1.6; color: #475569; }
              .success-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 12px 16px; font-size: 13px; color: #166534; margin: 20px 0; }
              .footer { background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header"><h1>JPCS Portal</h1></div>
              <div class="content">
                <p class="body-text">Hello, <strong>${fullName}</strong>!</p>
                <div class="success-box">✅ Your password has been successfully changed.</div>
                <p class="body-text">If you did not make this change, please contact your administrator immediately.</p>
              </div>
              <div class="footer">
                <p>Junior Philippine Computer Society (JPCS) Chapter</p>
                <p>San Sebastian College – Recoletos Manila</p>
              </div>
            </div>
          </body>
          </html>
        `;

        await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'api-key': brevoApiKey },
          body: JSON.stringify({
            sender: { name: 'JPCS Portal', email: senderEmail },
            to: [{ email, name: fullName }],
            subject: 'Your password has been changed – JPCS Portal',
            htmlContent
          })
        });
        console.log(`Password change confirmation email sent to ${email}`);
      } catch (emailErr) {
        // Non-critical: password is already changed, just log the error
        console.warn('Failed to send password change confirmation email:', emailErr.message);
      }
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Error in reset-password handler:', err);
    return res.status(500).json({ error: err.message || 'An unexpected error occurred.' });
  }
}
