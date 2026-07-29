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

// Rate limiting: max 3 requests per email per hour
const rateLimitCache = new Map();

function checkRateLimit(email) {
  const now = Date.now();
  const key = email.trim().toLowerCase();
  const record = rateLimitCache.get(key) || { count: 0, windowStart: now };
  
  // Reset window if older than 1 hour
  if (now - record.windowStart > 60 * 60 * 1000) {
    record.count = 0;
    record.windowStart = now;
  }
  
  if (record.count >= 3) {
    return false;
  }
  
  record.count++;
  rateLimitCache.set(key, record);
  return true;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'A valid email address is required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Rate limit check
    if (!checkRateLimit(normalizedEmail)) {
      return res.status(429).json({ error: 'Too many requests. Please wait before requesting another reset link.' });
    }

    // Check if user exists in Firestore
    const usersSnap = await db.collection('users')
      .where('email', '==', normalizedEmail)
      .limit(1)
      .get();

    // For security, always return success even if user not found (prevents email enumeration)
    if (usersSnap.empty) {
      console.log(`Password reset requested for non-existent email: ${normalizedEmail}`);
      return res.status(200).json({ success: true });
    }

    const userDoc = usersSnap.docs[0];
    const userData = userDoc.data();
    const uid = userData.id || userDoc.id;

    // Generate secure reset token
    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiry

    // Invalidate any existing reset tokens for this user
    const existingTokens = await db.collection('password_reset_tokens')
      .where('uid', '==', uid)
      .get();
    const batch = db.batch();
    existingTokens.forEach(doc => batch.delete(doc.ref));

    // Store new hashed token
    const tokenRef = db.collection('password_reset_tokens').doc(hashedToken);
    batch.set(tokenRef, {
      uid,
      email: normalizedEmail,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
      used: false
    });
    await batch.commit();

    console.log(`Password reset token generated for UID: ${uid}`);

    // Build email
    const domain = req.headers.host ? `https://${req.headers.host}` : 'https://jpcs-sscrmnl.vercel.app';
    const resetUrl = `${domain}/reset-password?token=${token}`;
    const brevoApiKey = process.env.BREVO_API_KEY;
    const senderEmail = process.env.BREVO_SENDER_EMAIL || 'keithciceron2004@gmail.com';

    if (!brevoApiKey) {
      console.error('BREVO_API_KEY not configured');
      return res.status(503).json({ error: 'Email service is not configured.' });
    }

    const fullName = userData.full_name || normalizedEmail.split('@')[0];

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Reset Your Password - JPCS Portal</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f7f9fc; margin: 0; padding: 0; color: #334155; }
          .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.03); }
          .header { background-color: #8b1e24; padding: 32px; text-align: center; color: #ffffff; }
          .header h1 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; }
          .header p { margin: 4px 0 0; font-size: 13px; opacity: 0.85; }
          .content { padding: 40px 32px; }
          .greeting { font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
          .body-text { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
          .btn-container { text-align: center; margin: 32px 0; }
          .btn { display: inline-block; padding: 14px 32px; background-color: #8b1e24; color: #ffffff !important; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 14px; letter-spacing: 0.05em; text-transform: uppercase; box-shadow: 0 4px 14px rgba(139,30,36,0.25); }
          .link-container { word-break: break-all; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; font-family: monospace; font-size: 12px; color: #64748b; margin-top: 24px; }
          .warning { background-color: #fff7ed; border: 1px solid #fed7aa; border-radius: 10px; padding: 12px 16px; font-size: 13px; color: #9a3412; margin-top: 16px; }
          .footer { background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; }
          .footer p { margin: 4px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>JPCS Portal</h1>
            <p>San Sebastian College – Recoletos Manila</p>
          </div>
          <div class="content">
            <div class="greeting">Hello, ${fullName}!</div>
            <p class="body-text">
              We received a request to reset the password for your JPCS Portal account. Click the button below to set a new password:
            </p>
            <div class="btn-container">
              <a href="${resetUrl}" class="btn" target="_blank">Reset My Password</a>
            </div>
            <div class="warning">
              ⚠️ This link expires in <strong>1 hour</strong>. If you did not request a password reset, you can safely ignore this email — your password will not be changed.
            </div>
            <p class="body-text" style="margin-top: 24px;">
              If the button above does not work, copy and paste this URL into your browser:
            </p>
            <div class="link-container">${resetUrl}</div>
          </div>
          <div class="footer">
            <p>Junior Philippine Computer Society (JPCS) Chapter</p>
            <p>San Sebastian College – Recoletos Manila</p>
            <p>Need help? Contact your administrator.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': brevoApiKey },
      body: JSON.stringify({
        sender: { name: 'JPCS Portal', email: senderEmail },
        to: [{ email: normalizedEmail, name: fullName }],
        subject: 'Reset your password – JPCS Portal',
        htmlContent
      })
    });

    const data = await response.json();
    console.log('Brevo password reset email response:', response.status, data);

    if (!response.ok) {
      throw new Error(data.message || 'Failed to send reset email via Brevo.');
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Error in forgot-password handler:', err);
    return res.status(500).json({ error: err.message || 'An unexpected error occurred.' });
  }
}
