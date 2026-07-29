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
      console.warn("No Service Account found. Firebase Admin will use default application credentials.");
      credential = admin.credential.applicationDefault();
    }
  }
  admin.initializeApp({ credential });
}

const db = admin.firestore();

export default async function handler(req, res) {
  // CORS support
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, uid, fullName } = req.body;
    if (!email || !uid || !fullName) {
      return res.status(400).json({ error: 'Missing required parameters: email, uid, or fullName' });
    }

    const brevoApiKey = process.env.BREVO_API_KEY;
    if (!brevoApiKey) {
      return res.status(503).json({ error: 'Email service key is not configured.' });
    }

    // 1. Generate secure random verification token (minimum 64 characters)
    const token = crypto.randomBytes(32).toString('hex'); // 64 hex characters
    // Hash the token using SHA-256 before storing
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // 2. Token expiration: 24 hours
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // 3. Write verification token document to Firestore
    const tokenRef = db.collection('verification_tokens').doc(hashedToken);
    await tokenRef.set({
      uid,
      email: email.trim().toLowerCase(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
      verified: false
    });

    console.log(`Generated verification token for UID ${uid}. Hashed token stored successfully.`);

    // 4. Construct professional email layout
    const domain = req.headers.host ? `https://${req.headers.host}` : 'https://jpcs-sscrmnl.vercel.app';
    const verificationUrl = `${domain}/verify-email?token=${token}`;
    
    const senderEmail = process.env.BREVO_SENDER_EMAIL || 'keithciceron2004@gmail.com';
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Verify Your Email - JPCS Portal</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f7f9fc; margin: 0; padding: 0; color: #334155; }
          .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03); }
          .header { background-color: #8b1e24; padding: 32px; text-align: center; color: #ffffff; }
          .header h1 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; }
          .header p { margin: 4px 0 0 0; font-size: 13px; opacity: 0.85; }
          .content { padding: 40px 32px; }
          .greeting { font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
          .body-text { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
          .btn-container { text-align: center; margin: 32px 0; }
          .btn { display: inline-block; padding: 14px 32px; background-color: #8b1e24; color: #ffffff !important; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 14px; letter-spacing: 0.05em; text-transform: uppercase; box-shadow: 0 4px 14px rgba(139, 30, 36, 0.25); transition: opacity 0.2s; }
          .link-container { word-break: break-all; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; font-family: monospace; font-size: 12px; color: #64748b; margin-top: 24px; }
          .footer { background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; }
          .footer p { margin: 4px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>JPCS Portal</h1>
            <p>San Sebastian College - Recoletos Manila</p>
          </div>
          <div class="content">
            <div class="greeting">Hello, ${fullName}!</div>
            <p class="body-text">
              Thank you for registering an account on the JPCS Portal. To activate your account and complete your registration, please verify your email address by clicking the button below:
            </p>
            <div class="btn-container">
              <a href="${verificationUrl}" class="btn" target="_blank">Verify My Email</a>
            </div>
            <p class="body-text" style="font-size: 12px; color: #64748b;">
              ⚠️ This verification link expires in <strong>24 hours</strong>. If the link has expired, you can request a new one from the portal login page.
            </p>
            <p class="body-text">
              If the button above does not work, copy and paste this URL into your browser:
            </p>
            <div class="link-container">
              ${verificationUrl}
            </div>
          </div>
          <div class="footer">
            <p>Junior Philippine Computer Society (JPCS) Chapter</p>
            <p>Need support? Contact us at support@jpcs-sscrmnl.com</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // 5. Send transaction email via Brevo API
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': brevoApiKey
      },
      body: JSON.stringify({
        sender: { name: 'JPCS Portal', email: senderEmail },
        to: [{ email: email.trim().toLowerCase(), name: fullName }],
        subject: 'Verify your email address - JPCS Portal',
        htmlContent: htmlContent
      })
    });

    const data = await response.json();
    console.log("Brevo email send response status:", response.status, data);

    if (!response.ok) {
      throw new Error(data.message || 'Failed to dispatch email via Brevo.');
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Error in send-verification handler:", err);
    return res.status(500).json({ error: err.message || 'An unexpected error occurred.' });
  }
}
