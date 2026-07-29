import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

const DEV = process.env.NODE_ENV !== 'production';

function parseJsonCandidate(value, fallback = null) {
  if (typeof value !== 'string') return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function getFirebaseAdmin() {
  if (admin.apps.length) {
    return admin;
  }

  const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT;
  let credential = null;

  if (serviceAccountRaw) {
    const serviceAccount = parseJsonCandidate(serviceAccountRaw);
    if (!serviceAccount) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT is not valid JSON.');
    }
    credential = admin.credential.cert(serviceAccount);
  } else {
    const serviceAccountPath = path.resolve(process.cwd(), 'service-account.json');
    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = parseJsonCandidate(fs.readFileSync(serviceAccountPath, 'utf8'));
      if (!serviceAccount) {
        throw new Error('service-account.json is invalid JSON.');
      }
      credential = admin.credential.cert(serviceAccount);
    }
  }

  if (!credential) {
    throw new Error('Firebase Admin service account is missing. Set FIREBASE_SERVICE_ACCOUNT or provide service-account.json for local development.');
  }

  admin.initializeApp({ credential });
  return admin;
}

export function getFirestore() {
  return getFirebaseAdmin().firestore();
}

export async function readRequestBody(req) {
  if (req?.body && typeof req.body === 'object') {
    return req.body;
  }

  if (typeof req?.body === 'string') {
    return parseJsonCandidate(req.body, {});
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const rawBody = Buffer.concat(chunks).toString('utf8').trim();
  if (!rawBody) {
    return {};
  }

  const body = parseJsonCandidate(rawBody);
  if (!body) {
    throw new Error('Request body must be valid JSON.');
  }
  return body;
}

export function getBaseUrl(req) {
  const host = req?.headers?.host;
  if (!host) {
    return 'https://jpcs-sscrmnl.vercel.app';
  }
  if (host.startsWith('localhost') || host.startsWith('127.0.0.1')) {
    return `http://${host}`;
  }
  return `https://${host}`;
}

export function jsonSuccess(res, payload = {}, status = 200) {
  return res.status(status).json({ success: true, ...payload });
}

export function jsonError(res, status, step, message, error, extras = {}) {
  const payload = {
    success: false,
    step,
    message,
    ...extras,
  };

  if (DEV && error?.stack) {
    payload.stack = error.stack;
  }

  return res.status(status).json(payload);
}

async function parseResponseBody(response) {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function sendBrevoEmail({
  apiKey,
  senderEmail,
  senderName,
  recipients,
  subject,
  htmlContent,
  timeoutMs = 10000,
  retries = 3,
}) {
  const payload = {
    sender: { name: senderName, email: senderEmail },
    to: recipients,
    subject,
    htmlContent,
  };

  let lastError = null;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': apiKey,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const parsed = await parseResponseBody(response);
      if (!response.ok) {
        const message = parsed && typeof parsed === 'object'
          ? parsed.message || parsed.error || parsed.code
          : parsed;
        throw new Error(typeof message === 'string' && message ? message : `Brevo request failed with status ${response.status}.`);
      }

      return { response, body: parsed };
    } catch (error) {
      lastError = error;
      if (attempt === retries) {
        throw error;
      }

      const backoffMs = 250 * (2 ** (attempt - 1));
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw lastError || new Error('Brevo request failed.');
}
