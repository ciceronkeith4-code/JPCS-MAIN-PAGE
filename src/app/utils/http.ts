export async function readJsonResponse(response: Response): Promise<{ data: any; text: string }> {
  const text = await response.text();
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json') || text.trim().startsWith('{') || text.trim().startsWith('[')) {
    try {
      return { data: text ? JSON.parse(text) : null, text };
    } catch {
      return { data: null, text };
    }
  }

  return { data: null, text };
}

export function extractApiMessage(data: unknown, fallback: string) {
  if (data && typeof data === 'object') {
    const payload = data as Record<string, unknown>;
    const candidate = payload.message ?? payload.error;
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate;
    }
  }

  if (typeof data === 'string' && data.trim()) {
    return data;
  }

  return fallback;
}
