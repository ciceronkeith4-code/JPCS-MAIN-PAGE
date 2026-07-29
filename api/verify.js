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
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'Verification token is required.' });
    }

    // 1. Hash the received token to match stored record
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const tokenRef = db.collection('verification_tokens').doc(hashedToken);
    const tokenSnap = await tokenRef.get();

    if (!tokenSnap.exists) {
      return res.status(400).json({ error: 'Invalid verification link or token has already been used.' });
    }

    const tokenData = tokenSnap.data();

    // 2. Check expiration (24 hours check)
    const now = admin.firestore.Timestamp.now();
    if (tokenData.expiresAt.seconds < now.seconds) {
      return res.status(400).json({ error: 'This verification link has expired. Please request a new one.' });
    }

    const { uid } = tokenData;

    // 3. Retrieve registration details from pending_profiles
    const pendingRef = db.collection('pending_profiles').doc(uid);
    const pendingSnap = await pendingRef.get();

    if (!pendingSnap.exists) {
      // Check if user already verified and exists in main users collection
      const userRef = db.collection('users').doc(uid);
      const userSnap = await userRef.get();
      if (userSnap.exists()) {
        // Already verified previously, clean up token and succeed
        await tokenRef.delete();
        return res.status(200).json({ success: true, message: 'Account is already verified.' });
      }
      return res.status(400).json({ error: 'Pending registration details not found.' });
    }

    const pendingUser = pendingSnap.data();
    const verifiedUser = {
      ...pendingUser,
      verified: true
    };

    // 4. Migrate pending profile to official users collection
    const userRef = db.collection('users').doc(uid);
    await userRef.set(verifiedUser);

    console.log(`Migrated user profile to users collection for UID ${uid}.`);

    // 5. Seed academic records for regular students (semester and subjects)
    if (pendingUser.year_level && pendingUser.year_level !== 'Irregular') {
      console.log(`Seeding academic records for verified student UID ${uid}...`);
      const targetYearNum = parseInt(pendingUser.year_level) || 1;

      // Query curriculum from Firestore
      const curriculumRef = db.collection('curriculum');
      const curriculumSnap = await curriculumRef
        .where('course', '==', pendingUser.course)
        .where('year_level', '==', targetYearNum)
        .where('semester', '==', 'First Semester')
        .get();

      const semId = crypto.randomUUID();
      const semDoc = {
        id: semId,
        user_id: uid,
        academic_year: '2025–2026',
        semester: 'First Semester'
      };

      // Save semester
      await db.collection('semesters').doc(semId).set(semDoc);

      if (!curriculumSnap.empty) {
        const batch = db.batch();
        curriculumSnap.forEach((doc) => {
          const item = doc.data();
          const subjectId = crypto.randomUUID();
          const subjectDoc = {
            id: subjectId,
            semester_id: semId,
            subject_code: item.subject_code,
            subject_name: item.subject_name,
            units: item.units,
            grade: 0,
            status: 'Graded'
          };
          const subRef = db.collection('subjects').doc(subjectId);
          batch.set(subRef, subjectDoc);
        });
        await batch.commit();
        console.log(`Seeded matching curriculum subjects for UID ${uid}.`);
      }
    }

    // 6. Clean up temporary pending profile and verification token
    await pendingRef.delete();
    await tokenRef.delete();

    console.log(`Successfully completed email verification flow for UID ${uid}.`);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Error in verify handler:", err);
    return res.status(500).json({ error: err.message || 'An unexpected error occurred.' });
  }
}
