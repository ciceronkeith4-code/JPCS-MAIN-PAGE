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
