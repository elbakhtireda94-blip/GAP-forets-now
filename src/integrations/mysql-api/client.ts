/**
 * MySQL backend API client.
 * Used when VITE_USE_MYSQL_BACKEND=true instead of Supabase.
 */

const STORAGE_KEY = 'anef_mysql_token';

export function getMySQLApiUrl(): string {
  const url = (import.meta.env.VITE_MYSQL_API_URL as string) || 'http://localhost:3002';
  const cleanUrl = url.replace(/\/$/, ''); // Remove trailing slash
  // Log au chargement (une seule fois)
  if (typeof window !== 'undefined' && !(window as any).__API_URL_LOGGED) {
    console.log('[API] Base URL:', cleanUrl);
    const currentHost = window.location.host;
    const hostname = currentHost.split(':')[0];
    const isLocalhost = cleanUrl.includes('localhost') || cleanUrl.includes('127.0.0.1');
    const isNetworkAccess = /^(\d+\.\d+\.\d+\.\d+)$/.test(hostname) || currentHost.includes('10.');
    if (isLocalhost && isNetworkAccess) {
      console.warn('[API] ⚠️ Frontend ouvert en IP mais API pointe vers localhost!');
      console.warn(`[API] Frontend: http://${currentHost} → API: ${cleanUrl}`);
      console.warn(`[API] 💡 Dans .env à la racine du projet, définir: VITE_MYSQL_API_URL=http://${hostname}:3002`);
    }
    (window as any).__API_URL_LOGGED = true;
  }
  return cleanUrl;
}

export function useMySQLBackend(): boolean {
  return import.meta.env.VITE_USE_MYSQL_BACKEND === 'true' || import.meta.env.VITE_USE_MYSQL_BACKEND === true;
}

export function getToken(): string | null {
  const token = localStorage.getItem(STORAGE_KEY);
  // Log pour déboguer (une seule fois au chargement)
  if (typeof window !== 'undefined' && !(window as any).__TOKEN_CHECKED) {
    console.log('[AUTH] Token present?', !!token, 'Key:', STORAGE_KEY);
    if (token) {
      console.log('[AUTH] Token length:', token.length, 'First 20 chars:', token.substring(0, 20) + '...');
    }
    (window as any).__TOKEN_CHECKED = true;
  }
  return token;
}

export function setToken(token: string | null): void {
  if (token) {
    localStorage.setItem(STORAGE_KEY, token);
    console.log('[AUTH] Token saved to localStorage:', STORAGE_KEY, 'Length:', token.length);
  } else {
    localStorage.removeItem(STORAGE_KEY);
    console.log('[AUTH] Token removed from localStorage:', STORAGE_KEY);
  }
}

export async function request<T = unknown>(
  method: string,
  path: string,
  body?: unknown
): Promise<{ data: T; error: null } | { data: null; error: { message: string } }> {
  const API_BASE_URL = getMySQLApiUrl();
  const base = API_BASE_URL.replace(/\/$/, '');
  const url = path.startsWith('/') ? `${base}${path}` : `${base}/api/${path}`;
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const isPdfcp = path.includes('pdfcp');
  const logPrefix = isPdfcp ? '[PDFCP]' : '[API]';
  console.log(`${logPrefix} ${method} URL=${url} (base=${API_BASE_URL})`);
  if (!token) {
    console.warn(`${logPrefix} No token - request may fail with 401`);
  }

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const contentType = res.headers.get('content-type') || '';
    const text = await res.text();

    // Enhanced logging for debugging "Unexpected token <" errors
    console.log(`${logPrefix} ${method} ${path}`, {
      status: res.status,
      contentType,
      url,
      hasToken: !!token,
      responseLength: text.length,
      isJSON: contentType.includes('application/json'),
      responsePreview: text.substring(0, 100)
    });

    // Si le serveur renvoie du HTML (404 SPA, mauvais proxy, etc.) → erreur explicite
    if (!contentType.includes('application/json')) {
      const snippet = text.trim().substring(0, 80);
      const port = base.split(':').pop() || '3002';
      const detailMsg = `Le serveur a renvoyé du HTML au lieu de JSON (mauvais endpoint ou proxy). URL: ${url} Port attendu: ${port}. Début réponse: ${snippet}${snippet.length >= 80 ? '...' : ''}`;
      console.error(`${logPrefix} ${detailMsg}`);
      return { data: null, error: { message: 'Backend temporairement indisponible. Vérifiez que le serveur tourne sur le port ' + port + ' (cd server && npm run dev).' } };
    }

    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch (parseErr) {
      const port = base.split(':').pop() || '3002';
      const msg = `Réponse invalide (JSON attendu).\n\nURL: ${url}\nBase URL: ${base}\nEndpoint: ${path}\nPort attendu: ${port}\n\n💡 Vérifiez:\n- Le serveur MySQL API est démarré sur le port ${port}\n- L'URL de base est correcte: ${base}\n- Le endpoint existe: ${path}\n\nDébut réponse: ${text.trim().substring(0, 60)}...`;
      console.error(`${logPrefix} ${msg}`, parseErr);
      return { data: null, error: { message: msg } };
    }

    if (!res.ok) {
      if (res.status === 401) {
        console.error(`${logPrefix} 401 Unauthorized`);
        if (typeof window !== 'undefined') {
          setToken(null);
          window.dispatchEvent(new CustomEvent('auth:unauthorized'));
        }
      }
      const payload = data as { error?: string; message?: string };
      const errMsg = payload?.error || payload?.message || res.statusText || 'Request failed';
      return { data: null, error: { message: errMsg } };
    }
    return { data: data as T, error: null };
  } catch (e) {
    const err = e as Error;
    const base = getMySQLApiUrl();
    const port = base.split(':').pop() || '3002';
    console.error(`${logPrefix} Fetch error:`, err);
    console.error(`[API] Backend not running on PORT ${port} — start with: cd server && npm run dev`);
    // Message utilisateur court (ne pas bloquer l'app)
    const userMessage =
      'Failed to fetch' === err.message || /network|fetch/i.test(err.message || '')
        ? 'Backend temporairement indisponible. Démarrez le serveur : cd server && npm run dev'
        : err.message || 'Backend temporairement indisponible';
    return { data: null, error: { message: userMessage } };
  }
}

export type LoginSuccess = { access_token: string; user: { id: string; email: string } };
export type LoginResult = LoginSuccess | { error: string };

export async function login(email: string, password: string): Promise<LoginResult> {
  console.log('[AUTH] Attempting login for:', email);
  const { data, error } = await request<{ access_token?: string; user?: { id: string; email: string } }>(
    'POST',
    '/api/auth/login',
    { email: email.trim().toLowerCase(), password }
  );
  const errMsg = error?.message || (data && !data.access_token ? 'No access_token in response' : '');
  if (error || !data?.access_token) {
    console.error('[AUTH] Login failed:', errMsg);
    return { error: errMsg || 'Connexion refusée' };
  }
  console.log('[AUTH] Login successful, storing token...');
  setToken(data.access_token);
  const storedToken = getToken();
  if (!storedToken) {
    console.error('[AUTH] ⚠️ Token was not stored correctly!');
  } else {
    console.log('[AUTH] ✓ Token stored successfully, length:', storedToken.length);
  }
  return { access_token: data.access_token, user: data.user! };
}

export async function getProfile(): Promise<Array<{
  id: string;
  user_id?: string;
  email: string;
  full_name: string;
  role_label: string | null;
  scope_level: string;
  dranef_id: string | null;
  dpanef_id: string | null;
  commune_ids: string[];
}> | null> {
  const { data, error } = await request<ReturnType<typeof getProfile> extends Promise<infer T> ? T : never>(
    'GET',
    '/api/auth/me'
  );
  if (error || !data) return null;
  return Array.isArray(data) ? data : [data];
}

export async function logout(): Promise<void> {
  setToken(null);
}

/**
 * Safe JSON fetch utility that guarantees JSON response handling.
 * Throws detailed error if server returns HTML or invalid JSON.
 * Use this for critical endpoints (PDFCP actions, etc.) to avoid "Unexpected token <" errors.
 * 
 * @param url Full URL to fetch
 * @param options Fetch options (method, headers, body, etc.)
 * @returns Parsed JSON data
 * @throws Error with detailed message if response is not JSON
 */
export async function safeJsonFetch<T = unknown>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const baseUrl = getMySQLApiUrl();
  const port = baseUrl.split(':').pop() || '3002';
  
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const contentType = res.headers.get('content-type') || '';
    const text = await res.text();

    // Check if response is JSON
    if (!contentType.includes('application/json')) {
      const snippet = text.trim().substring(0, 200);
      const errorMsg = `Le serveur a renvoyé une réponse non-JSON (souvent mauvais port/endpoint).\n\nURL: ${url}\nBase URL: ${baseUrl}\nPort attendu: ${port}\nStatus: ${res.status}\n\n💡 Vérifiez:\n- Le serveur MySQL API est démarré sur le port ${port}\n- VITE_MYSQL_API_URL est correcte: ${baseUrl}\n- CORS est configuré correctement\n- Le endpoint existe\n\nDébut réponse (${text.length} chars):\n${snippet}${snippet.length >= 200 ? '...' : ''}`;
      console.error('[safeJsonFetch]', errorMsg);
      throw new Error(errorMsg);
    }

    // Parse JSON
    let data: T;
    try {
      data = text ? JSON.parse(text) : null as T;
    } catch (parseErr) {
      const snippet = text.trim().substring(0, 200);
      const errorMsg = `Réponse invalide (JSON attendu).\n\nURL: ${url}\nBase URL: ${baseUrl}\nPort attendu: ${port}\nStatus: ${res.status}\n\n💡 Vérifiez:\n- Le serveur MySQL API est démarré sur le port ${port}\n- VITE_MYSQL_API_URL est correcte: ${baseUrl}\n- Le endpoint existe\n\nDébut réponse (${text.length} chars):\n${snippet}${snippet.length >= 200 ? '...' : ''}`;
      console.error('[safeJsonFetch] Parse error:', parseErr);
      throw new Error(errorMsg);
    }

    if (!res.ok) {
      const errorMsg = (data as { error?: string })?.error || res.statusText || 'Request failed';
      throw new Error(`HTTP ${res.status}: ${errorMsg}`);
    }

    return data;
  } catch (e) {
    if (e instanceof Error) {
      throw e;
    }
    throw new Error(`Fetch error: ${String(e)}`);
  }
}

// REST helpers for data tables (used by hooks when MySQL backend is on)
export const mysqlApi = {
  getCahierJournalEntries: (params?: { adp_user_id?: string; dpanef_id?: string; dranef_id?: string }) =>
    request('GET', '/api/cahier-journal-entries' + (params && Object.keys(params).length ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '')),
  postCahierJournalEntry: (body: Record<string, unknown>) =>
    request('POST', '/api/cahier-journal-entries', body),
  patchCahierJournalEntry: (id: string, body: Record<string, unknown>) =>
    request('PATCH', `/api/cahier-journal-entries/${id}`, body),
  deleteCahierJournalEntry: (id: string) =>
    request('DELETE', `/api/cahier-journal-entries/${id}`),
  getPdfcpPrograms: () =>
    request('GET', '/api/pdfcp/programs'),
  getPdfcpProgram: (id: string) =>
    request('GET', `/api/pdfcp/programs/${id}`),
  postPdfcpProgram: (body: Record<string, unknown>) =>
    request('POST', '/api/pdfcp/programs', body),
  patchPdfcpProgram: (id: string, body: Record<string, unknown>) =>
    request('PATCH', `/api/pdfcp/programs/${id}`, body),
  getPdfcpActions: (pdfcpId: string) =>
    request('GET', `/api/pdfcp/programs/${pdfcpId}/actions`),
  postPdfcpAction: (pdfcpId: string, body: Record<string, unknown>) =>
    request('POST', `/api/pdfcp/programs/${pdfcpId}/actions`, body),
  patchPdfcpAction: (pdfcpId: string, actionId: string, body: Record<string, unknown>) =>
    request('PATCH', `/api/pdfcp/programs/${pdfcpId}/actions/${actionId}`, body),
  deletePdfcpAction: (pdfcpId: string, actionId: string) =>
    request('DELETE', `/api/pdfcp/programs/${pdfcpId}/actions/${actionId}`),
  getPdfcpAttachments: (pdfcpId: string) =>
    request('GET', `/api/pdfcp/programs/${pdfcpId}/attachments`),
  postPdfcpAttachment: (pdfcpId: string, body: Record<string, unknown>) =>
    request('POST', `/api/pdfcp/programs/${pdfcpId}/attachments`, body),
  deletePdfcpAttachment: (pdfcpId: string, attachmentId: string) =>
    request('DELETE', `/api/pdfcp/programs/${pdfcpId}/attachments/${attachmentId}`),
  getPdfcpHistory: (pdfcpId: string) =>
    request('GET', `/api/pdfcp/programs/${pdfcpId}/history`),
  postPdfcpHistory: (pdfcpId: string, body: Record<string, unknown>) =>
    request('POST', `/api/pdfcp/programs/${pdfcpId}/history`, body),
  getPdfcpComparatif: (pdfcpId: string) =>
    request('GET', `/api/pdfcp/programs/${pdfcpId}/comparatif`),
  getRegions: () =>
    request('GET', '/api/regions'),
};
