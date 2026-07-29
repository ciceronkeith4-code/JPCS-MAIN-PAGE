import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import admin from 'firebase-admin'
import fs from 'fs'
import crypto from 'crypto'

function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

function localApiRoutesPlugin() {
  return {
    name: 'local-api-routes-plugin',
    configureServer(server: any) {
      // Initialize Firebase Admin for local dev server
      if (!admin.apps.length) {
        try {
          const saPath = path.resolve(process.cwd(), 'service-account.json');
          if (fs.existsSync(saPath)) {
            const sa = JSON.parse(fs.readFileSync(saPath, 'utf8'));
            admin.initializeApp({
              credential: admin.credential.cert(sa)
            });
            console.log("Firebase Admin initialized for local dev server proxy.");
          } else {
            console.warn("No service-account.json found. Local API endpoints will run without Firebase Admin.");
          }
        } catch (err: any) {
          console.error("Failed to initialize Firebase Admin locally:", err.message);
        }
      }

      server.middlewares.use(async (req: any, res: any, next: any) => {
        const parsedUrl = new URL(req.url || '', `http://${req.headers.host}`);
        const pathname = parsedUrl.pathname;

        if (pathname === '/api/send-verification' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk: any) => { body += chunk; });
          req.on('end', async () => {
            try {
              const { email, uid, fullName } = JSON.parse(body);
              const brevoApiKey = process.env.BREVO_API_KEY;
              
              const token = crypto.randomBytes(32).toString('hex');
              const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
              const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

              const db = admin.firestore();
              await db.collection('verification_tokens').doc(hashedToken).set({
                uid,
                email: email.trim().toLowerCase(),
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
                verified: false
              });

              const domain = `http://${req.headers.host}`;
              const verificationUrl = `${domain}/verify-email?token=${token}`;
              const senderEmail = process.env.BREVO_SENDER_EMAIL || 'keithciceron2004@gmail.com';

              const htmlContent = `
                <div style="font-family: sans-serif; padding: 20px;">
                  <h2>JPCS Portal Email Verification</h2>
                  <p>Hello, ${fullName}!</p>
                  <p>Click the button below to verify your email address:</p>
                  <p><a href="${verificationUrl}" style="padding: 10px 20px; background: #8b1e24; color: white; text-decoration: none; border-radius: 5px; display: inline-block;">Verify My Email</a></p>
                  <p>Or copy this link: ${verificationUrl}</p>
                </div>
              `;

              const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'api-key': brevoApiKey
                },
                body: JSON.stringify({
                  sender: { name: 'JPCS Portal (Dev)', email: senderEmail },
                  to: [{ email: email.trim().toLowerCase(), name: fullName }],
                  subject: 'Verify your email address - JPCS Portal',
                  htmlContent: htmlContent
                })
              });

              const brevoData = await brevoRes.json();
              if (!brevoRes.ok) {
                throw new Error(brevoData.message || 'Brevo SMTP dispatch failed.');
              }

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true }));
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message }));
            }
          });
        } else if (pathname === '/api/verify' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk: any) => { body += chunk; });
          req.on('end', async () => {
            try {
              const { token } = JSON.parse(body);
              const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
              const db = admin.firestore();

              const tokenRef = db.collection('verification_tokens').doc(hashedToken);
              const tokenSnap = await tokenRef.get();

              if (!tokenSnap.exists) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Invalid verification token.' }));
                return;
              }

              const tokenData = tokenSnap.data();
              const now = admin.firestore.Timestamp.now();
              if (tokenData.expiresAt.seconds < now.seconds) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'This verification link has expired.' }));
                return;
              }

              const { uid } = tokenData;
              const pendingRef = db.collection('pending_profiles').doc(uid);
              const pendingSnap = await pendingRef.get();

              if (!pendingSnap.exists) {
                const userSnap = await db.collection('users').doc(uid).get();
                if (userSnap.exists) {
                  await tokenRef.delete();
                  res.statusCode = 200;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ success: true }));
                  return;
                }
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Pending profile details not found.' }));
                return;
              }

              const pendingUser = pendingSnap.data();
              await db.collection('users').doc(uid).set({ ...pendingUser, verified: true });

              // Seed academic records
              if (pendingUser.year_level && pendingUser.year_level !== 'Irregular') {
                const targetYearNum = parseInt(pendingUser.year_level) || 1;
                const curriculumSnap = await db.collection('curriculum')
                  .where('course', '==', pendingUser.course)
                  .where('year_level', '==', targetYearNum)
                  .where('semester', '==', 'First Semester')
                  .get();

                const semId = crypto.randomUUID();
                await db.collection('semesters').doc(semId).set({
                  id: semId,
                  user_id: uid,
                  academic_year: '2025–2026',
                  semester: 'First Semester'
                });

                if (!curriculumSnap.empty) {
                  const batch = db.batch();
                  curriculumSnap.forEach((doc) => {
                    const item = doc.data();
                    const subjectId = crypto.randomUUID();
                    const subRef = db.collection('subjects').doc(subjectId);
                    batch.set(subRef, {
                      id: subjectId,
                      semester_id: semId,
                      subject_code: item.subject_code,
                      subject_name: item.subject_name,
                      units: item.units,
                      grade: 0,
                      status: 'Graded'
                    });
                  });
                  await batch.commit();
                }
              }

              await pendingRef.delete();
              await tokenRef.delete();

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true }));
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message }));
            }
          });
        } else if (pathname === '/api/forgot-password' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk: any) => { body += chunk; });
          req.on('end', async () => {
            try {
              const { email } = JSON.parse(body);
              const normalizedEmail = email?.trim().toLowerCase();
              if (!normalizedEmail?.includes('@')) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'A valid email address is required.' }));
                return;
              }
              const db = admin.firestore();
              const usersSnap = await db.collection('users').where('email', '==', normalizedEmail).limit(1).get();
              if (usersSnap.empty) {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true }));
                return;
              }
              const userDoc = usersSnap.docs[0];
              const userData = userDoc.data();
              const uid = userData.id || userDoc.id;
              const token = crypto.randomBytes(32).toString('hex');
              const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
              const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
              const existingTokens = await db.collection('password_reset_tokens').where('uid', '==', uid).get();
              const batch = db.batch();
              existingTokens.forEach((d: any) => batch.delete(d.ref));
              batch.set(db.collection('password_reset_tokens').doc(hashedToken), {
                uid, email: normalizedEmail,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
                used: false
              });
              await batch.commit();
              const domain = `http://${req.headers.host}`;
              const resetUrl = `${domain}/reset-password?token=${token}`;
              const brevoApiKey = process.env.BREVO_API_KEY;
              const senderEmail = process.env.BREVO_SENDER_EMAIL || 'keithciceron2004@gmail.com';
              if (!brevoApiKey) {
                res.statusCode = 503;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Email service not configured.' }));
                return;
              }
              const fullName = userData.full_name || normalizedEmail.split('@')[0];
              const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'api-key': brevoApiKey },
                body: JSON.stringify({
                  sender: { name: 'JPCS Portal (Dev)', email: senderEmail },
                  to: [{ email: normalizedEmail, name: fullName }],
                  subject: 'Reset your password – JPCS Portal',
                  htmlContent: `<p>Hello ${fullName},</p><p>Click to reset your password: <a href="${resetUrl}">${resetUrl}</a></p><p>This link expires in 1 hour.</p>`
                })
              });
              const brevoData = await brevoRes.json();
              if (!brevoRes.ok) throw new Error(brevoData.message || 'Brevo dispatch failed.');
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true }));
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message }));
            }
          });
        } else if (pathname === '/api/reset-password' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk: any) => { body += chunk; });
          req.on('end', async () => {
            try {
              const { token, newPassword } = JSON.parse(body);
              if (!token || !newPassword || newPassword.length < 8) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Token and password (min 8 chars) are required.' }));
                return;
              }
              const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
              const db = admin.firestore();
              const tokenRef = db.collection('password_reset_tokens').doc(hashedToken);
              const tokenSnap = await tokenRef.get();
              if (!tokenSnap.exists) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Invalid or already-used reset token.' }));
                return;
              }
              const tokenData = tokenSnap.data();
              const now = admin.firestore.Timestamp.now();
              if (tokenData.expiresAt.seconds < now.seconds) {
                await tokenRef.delete();
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'This reset link has expired.' }));
                return;
              }
              await admin.auth().updateUser(tokenData.uid, { password: newPassword });
              await tokenRef.delete();
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true }));
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message }));
            }
          });
        } else if (pathname === '/api/resend-verification' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk: any) => { body += chunk; });
          req.on('end', async () => {
            try {
              const { email } = JSON.parse(body);
              const normalizedEmail = email?.trim().toLowerCase();
              if (!normalizedEmail?.includes('@')) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'A valid email address is required.' }));
                return;
              }
              const db = admin.firestore();
              const pendingSnap = await db.collection('pending_profiles').where('email', '==', normalizedEmail).limit(1).get();
              if (pendingSnap.empty) {
                res.statusCode = 404;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'No pending registration found for this email.' }));
                return;
              }
              const pendingDoc = pendingSnap.docs[0];
              const pendingData = pendingDoc.data();
              const uid = pendingData.id || pendingDoc.id;
              const oldTokens = await db.collection('verification_tokens').where('uid', '==', uid).get();
              const batch = db.batch();
              oldTokens.forEach((d: any) => batch.delete(d.ref));
              const token = crypto.randomBytes(32).toString('hex');
              const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
              const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
              batch.set(db.collection('verification_tokens').doc(hashedToken), {
                uid, email: normalizedEmail,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
                verified: false
              });
              await batch.commit();
              const brevoApiKey = process.env.BREVO_API_KEY;
              const senderEmail = process.env.BREVO_SENDER_EMAIL || 'keithciceron2004@gmail.com';
              if (!brevoApiKey) {
                res.statusCode = 503;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Email service not configured.' }));
                return;
              }
              const domain = `http://${req.headers.host}`;
              const verificationUrl = `${domain}/verify-email?token=${token}`;
              const fullName = pendingData.full_name || normalizedEmail.split('@')[0];
              const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'api-key': brevoApiKey },
                body: JSON.stringify({
                  sender: { name: 'JPCS Portal (Dev)', email: senderEmail },
                  to: [{ email: normalizedEmail, name: fullName }],
                  subject: 'Your new verification link – JPCS Portal',
                  htmlContent: `<p>Hello ${fullName},</p><p>Click to verify your email: <a href="${verificationUrl}">${verificationUrl}</a></p><p>Expires in 24 hours.</p>`
                })
              });
              const brevoData = await brevoRes.json();
              if (!brevoRes.ok) throw new Error(brevoData.message || 'Brevo dispatch failed.');
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true }));
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message }));
            }
          });
        } else {
          next();
        }
      });
    },
  };
}

export default defineConfig({
  base: '/',
  server: {
    open: '/',
  },
  plugins: [
    localApiRoutesPlugin(),
    figmaAssetResolver(),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
