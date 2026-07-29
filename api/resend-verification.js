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

// Rate limiting: max 5 resend requests per email per day
const rateLimitCache = new Map();

function checkRateLimit(email) {
  const now = Date.now();
  const key = `resend:${email.trim().toLowerCase()}`;
  const record = rateLimitCache.get(key) || { count: 0, windowStart: now };

  if (now - record.windowStart > 24 * 60 * 60 * 1000) {
    record.count = 0;
    record.windowStart = now;
  }

  if (record.count >= 5) return false;

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
      return res.status(429).json({ error: 'Maximum resend limit reached for today. Please try again tomorrow.' });
    }

    // Look up pending profile
    const pendingSnap = await db.collection('pending_profiles')
      .where('email', '==', normalizedEmail)
      .limit(1)
      .get();

    if (pendingSnap.empty) {
      // Check if user is already verified
      const userSnap = await db.collection('users')
        .where('email', '==', normalizedEmail)
        .limit(1)
        .get();
      if (!userSnap.empty) {
        return res.status(400).json({ error: 'This account is already verified. Please sign in.' });
      }
      return res.status(404).json({ error: 'No pending registration found for this email.' });
    }

    const pendingDoc = pendingSnap.docs[0];
    const pendingData = pendingDoc.data();
    const uid = pendingData.id || pendingDoc.id;
    const fullName = pendingData.full_name || normalizedEmail.split('@')[0];

    // Invalidate old verification tokens for this user
    const oldTokens = await db.collection('verification_tokens')
      .where('uid', '==', uid)
      .get();
    const batch = db.batch();
    oldTokens.forEach(doc => batch.delete(doc.ref));

    // Generate fresh token
    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const tokenRef = db.collection('verification_tokens').doc(hashedToken);
    batch.set(tokenRef, {
      uid,
      email: normalizedEmail,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
      verified: false
    });
    await batch.commit();

    console.log(`New verification token generated for UID: ${uid}`);

    const brevoApiKey = process.env.BREVO_API_KEY;
    const senderEmail = process.env.BREVO_SENDER_EMAIL || 'keithciceron2004@gmail.com';

    if (!brevoApiKey) {
      return res.status(503).json({ error: 'Email service is not configured.' });
    }

    const domain = req.headers.host ? `https://${req.headers.host}` : 'https://jpcs-sscrmnl.vercel.app';
    const verificationUrl = `${domain}/verify-email?token=${token}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Verify Your Email – JPCS Portal</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f7f9fc; margin: 0; padding: 0; color: #334155; }
          .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.03); }
          .header { background-color: #8b1e24; padding: 32px; text-align: center; color: #ffffff; }
          .header h1 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; }
          .header p { margin: 4px 0 0; font-size: 13px; opacity: 0.85; }
          .content { padding: 40px 32px; }
          .greeting { font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
          .body-text { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
          .btn-container { text-align: center; margin: 32px 0; }
          .btn { display: inline-block; padding: 14px 32px; background-color: #8b1e24; color: #ffffff !important; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 14px; letter-spacing: 0.05em; text-transform: uppercase; box-shadow: 0 4px 14px rgba(139,30,36,0.25); }
          .link-container { word-break: break-all; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; font-family: monospace; font-size: 12px; color: #64748b; margin-top: 24px; }
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
              Here is your new email verification link. Please click the button below to activate your JPCS Portal account:
            </p>
            <div class="btn-container">
              <a href="${verificationUrl}" class="btn" target="_blank">Verify My Email</a>
            </div>
            <p class="body-text" style="font-size: 12px; color: #64748b;">
              ⚠️ This verification link expires in <strong>24 hours</strong>.
            </p>
            <p class="body-text">If the button does not work, copy and paste this URL into your browser:</p>
            <div class="link-container">${verificationUrl}</div>
          </div>
          <div class="footer">
            <p>Junior Philippine Computer Society (JPCS) Chapter</p>
            <p>San Sebastian College – Recoletos Manila</p>
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
        subject: 'Your new verification link – JPCS Portal',
        htmlContent
      })
    });

    const data = await response.json();
    console.log('Brevo resend verification response:', response.status, data);

    if (!response.ok) {
      throw new Error(data.message || 'Failed to send verification email via Brevo.');
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Error in resend-verification handler:', err);
    return res.status(500).json({ error: err.message || 'An unexpected error occurred.' });
  }
}
