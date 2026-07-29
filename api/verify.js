import crypto from 'crypto';
import { getFirebaseAdmin, readRequestBody, jsonError, jsonSuccess } from './_shared.js';

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
    const token = typeof body.token === 'string' ? body.token.trim() : '';
    if (!token) {
      return jsonError(res, 400, 'request_validation', 'Verification token is required.');
    }

    step = 'token_lookup';
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const tokenRef = db.collection('verification_tokens').doc(hashedToken);
    const tokenSnap = await tokenRef.get();
    if (!tokenSnap.exists) {
      return jsonError(res, 400, 'token_lookup', 'Invalid verification link or token has already been used.');
    }

    const tokenData = tokenSnap.data() || {};
    const expiresAtSeconds = tokenData.expiresAt?.seconds;
    if (!Number.isFinite(expiresAtSeconds)) {
      return jsonError(res, 500, 'token_lookup', 'Stored verification token is invalid.');
    }

    step = 'token_expiry_check';
    const now = admin.firestore.Timestamp.now();
    if (expiresAtSeconds < now.seconds) {
      return jsonError(res, 400, 'token_expiry_check', 'This verification link has expired. Please request a new one.');
    }

    const uid = tokenData.uid;
    if (!uid) {
      return jsonError(res, 500, 'token_lookup', 'Verification token is missing a user id.');
    }

    step = 'pending_profile_lookup';
    const pendingRef = db.collection('pending_profiles').doc(uid);
    const pendingSnap = await pendingRef.get();

    if (!pendingSnap.exists) {
      step = 'user_lookup';
      const userRef = db.collection('users').doc(uid);
      const userSnap = await userRef.get();
      if (userSnap.exists) {
        await tokenRef.delete();
        return jsonSuccess(res, { message: 'Account is already verified.' });
      }
      return jsonError(res, 400, 'pending_profile_lookup', 'Pending registration details not found.');
    }

    const pendingUser = pendingSnap.data() || {};
    const verifiedUser = {
      ...pendingUser,
      verified: true,
    };

    step = 'user_create';
    const userRef = db.collection('users').doc(uid);
    await userRef.set(verifiedUser);

    if (pendingUser.year_level && pendingUser.year_level !== 'Irregular') {
      step = 'seed_curriculum';
      const targetYearNum = parseInt(pendingUser.year_level, 10) || 1;
      const curriculumSnap = await db.collection('curriculum')
        .where('course', '==', pendingUser.course)
        .where('year_level', '==', targetYearNum)
        .where('semester', '==', 'First Semester')
        .get();

      const semId = crypto.randomUUID();
      await db.collection('semesters').doc(semId).set({
        id: semId,
        user_id: uid,
        academic_year: '2025-2026',
        semester: 'First Semester',
      });

      if (!curriculumSnap.empty) {
        const batch = db.batch();
        curriculumSnap.forEach((doc) => {
          const item = doc.data();
          const subjectId = crypto.randomUUID();
          batch.set(db.collection('subjects').doc(subjectId), {
            id: subjectId,
            semester_id: semId,
            subject_code: item.subject_code,
            subject_name: item.subject_name,
            units: item.units,
            grade: 0,
            status: 'Graded',
          });
        });
        await batch.commit();
      }
    }

    step = 'cleanup';
    await pendingRef.delete();
    await tokenRef.delete();

    return jsonSuccess(res);
  } catch (err) {
    return jsonError(res, 500, step, err?.message || 'An unexpected error occurred.', err, {
      environment: {
        firebaseServiceAccountConfigured: !!process.env.FIREBASE_SERVICE_ACCOUNT,
      },
    });
  }
}
