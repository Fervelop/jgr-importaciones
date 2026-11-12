// Inicio de sesión del panel con GitHub OAuth.
// Tienda JGR: entran los usuarios de ADMIN_USERS, el dueño del repositorio GITHUB_REPO
// y sus colaboradores con permiso de escritura (push, maintain o admin).
// Tienda secundaria (STORE distinto de "jgr"): SOLO los usuarios de ADMIN_USERS.

import { MAIN_STORE, isMainStore, storeId, type Env } from './settings';

export const SESSION_COOKIE = 'jgr_admin';
export const STATE_COOKIE = 'jgr_oauth_state';
export const SESSION_HOURS = 12;

/** `store`: tienda del panel donde se inició la sesión (las sesiones antiguas sin este dato son de JGR). */
export type Session = { login: string; name: string; avatar: string; store?: string; exp: number };

/** Una sesión solo vale en el panel de la tienda donde se abrió. */
export function sessionFitsStore(session: Session, env: Pick<Env, 'STORE'>): boolean {
  return (session.store || MAIN_STORE) === storeId(env);
}

const enc = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64url(s: string): Uint8Array<ArrayBuffer> {
  const pad = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  const bin = atob(pad);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function hmacKey(secret: string) {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ]);
}

export function sessionSecret(env: Env): string {
  const s = env.SESSION_SECRET || '';
  if (s.length < 32) throw new Error('SESSION_SECRET debe tener al menos 32 caracteres.');
  return s;
}

export async function signSession(session: Session, secret: string): Promise<string> {
  const body = b64url(enc.encode(JSON.stringify(session)));
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode(body)));
  return `${body}.${b64url(sig)}`;
}

export async function verifySession(token: string | undefined, secret: string, now = Date.now()): Promise<Session | null> {
  if (!token || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  try {
    const ok = await crypto.subtle.verify('HMAC', await hmacKey(secret), fromB64url(sig), enc.encode(body));
    if (!ok) return null;
    const data = JSON.parse(new TextDecoder().decode(fromB64url(body))) as Session;
    if (!data.login || typeof data.exp !== 'number' || data.exp < now) return null;
    return data;
  } catch {
    return null;
  }
}

export function randomToken(bytes = 24): string {
  return b64url(crypto.getRandomValues(new Uint8Array(bytes)));
}

/** Compara dos textos en tiempo constante. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export function isLocalHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]' || hostname.endsWith('.localhost');
}

const GH_HEADERS = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'jgr-importaciones-admin',
  'X-GitHub-Api-Version': '2022-11-28',
};

export type AccessResult = { allowed: boolean; reason: string };

/**
 * Decide si un usuario de GitHub puede entrar al panel.
 * `fetcher` se puede reemplazar en las pruebas.
 */
export async function checkAccess(
  login: string,
  token: string,
  env: Pick<Env, 'GITHUB_REPO' | 'ADMIN_USERS' | 'STORE'>,
  fetcher: typeof fetch = fetch,
): Promise<AccessResult> {
  const lower = login.toLowerCase();
  const allowList = (env.ADMIN_USERS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (allowList.includes(lower)) return { allowed: true, reason: 'lista' };
  // En una tienda secundaria solo entran los usuarios de ADMIN_USERS (ni dueño ni colaboradores del repositorio).
  if (!isMainStore(storeId(env))) return { allowed: false, reason: 'no-esta-en-la-lista' };

  const repo = (env.GITHUB_REPO || '').trim();
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) return { allowed: false, reason: 'repo-no-configurado' };
  if (repo.split('/')[0].toLowerCase() === lower) return { allowed: true, reason: 'dueño' };

  const res = await fetcher(`https://api.github.com/repos/${repo}`, {
    headers: { ...GH_HEADERS, Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return { allowed: false, reason: `repo-${res.status}` };
  const data = (await res.json()) as { permissions?: Record<string, boolean>; owner?: { login?: string } };
  if (data.owner?.login?.toLowerCase() === lower) return { allowed: true, reason: 'dueño' };
  const p = data.permissions || {};
  if (p.admin || p.maintain || p.push) return { allowed: true, reason: 'colaborador' };
  return { allowed: false, reason: 'sin-permiso-de-escritura' };
}

export async function exchangeCode(env: Env, code: string, redirectUri: string, fetcher: typeof fetch = fetch) {
  const res = await fetcher('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'User-Agent': GH_HEADERS['User-Agent'] },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri,
    }),
  });
  const data = (await res.json()) as { access_token?: string; error?: string };
  if (!data.access_token) throw new Error(data.error || 'no-token');
  return data.access_token;
}

export async function fetchGithubUser(token: string, fetcher: typeof fetch = fetch) {
  const res = await fetcher('https://api.github.com/user', { headers: { ...GH_HEADERS, Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`user-${res.status}`);
  const u = (await res.json()) as { login: string; name?: string; avatar_url?: string };
  return { login: u.login, name: u.name || u.login, avatar: u.avatar_url || '' };
}
