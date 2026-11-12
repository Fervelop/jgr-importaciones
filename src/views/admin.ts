import { html, raw } from 'hono/html';
import type { Settings } from '../lib/defaults';
import { isMainStore, storeId, type Env } from '../lib/settings';
import { themeStyle } from './layout';
import { icon } from './icons';

function head(s: Settings, title: string) {
  return html`<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${title} | ${s.brand.name}</title>
<link rel="icon" href="/marca/favicon-32.png" sizes="32x32">
<script>try{if(localStorage.getItem('jgr-theme')==='dark')document.documentElement.setAttribute('data-theme','dark')}catch(e){}</script>
<link rel="stylesheet" href="/assets/css/fonts.css">
<link rel="stylesheet" href="/admin-app/admin.css?v=2">
${themeStyle(s)}`;
}

/** Datos de la tienda que el panel necesita saber (si es JGR o la tienda secundaria). */
export type StoreInfo = { id: string; main: boolean };
export function storeInfo(env: Pick<Env, 'STORE'>): StoreInfo {
  const id = storeId(env);
  return { id, main: isMainStore(id) };
}

const ERRORS: Record<string, string> = {
  'sin-permiso': 'Tu cuenta de GitHub no es dueña ni colaboradora con permiso de escritura del repositorio de la tienda. Pide al dueño que te invite como colaborador.',
  estado: 'El inicio de sesión expiró o se abrió en otra pestaña. Intenta de nuevo.',
  github: 'GitHub no respondió como esperábamos. Intenta de nuevo en un momento.',
  config: 'Falta configurar el inicio de sesión con GitHub (GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, SESSION_SECRET o GITHUB_REPO). Revisa la guía del README.',
  cancelado: 'Cancelaste el inicio de sesión en GitHub.',
};

export function loginPage(s: Settings, opts: { error?: string; devLogin: boolean; secondary?: boolean }) {
  let msg = opts.error ? ERRORS[opts.error] || ERRORS.github : '';
  if (opts.secondary && opts.error === 'sin-permiso') msg = 'Tu cuenta de GitHub no tiene acceso al panel de esta tienda.';
  return html`<!doctype html>
<html lang="es-CO" data-theme="light"><head>${head(s, 'Entrar al panel')}</head>
<body class="acceso">
  <main class="acceso__caja">
    <img src="${s.brand.logo}" alt="${s.brand.name}" width="120" height="108">
    <h1>Panel de ${s.brand.name}</h1>
    <p>${opts.secondary ? 'Entra con la cuenta de GitHub autorizada para esta tienda.' : 'Entra con la cuenta de GitHub del dueño o de un colaborador del repositorio de la tienda.'}</p>
    ${msg ? html`<p class="acceso__error" role="alert">${msg}</p>` : ''}
    <a class="btn btn--primario btn--grande" href="/auth/github">
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.3-3.4-1.3-.5-1.1-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.6 2.4 1.1 3 .9.1-.7.4-1.1.6-1.4-2.2-.3-4.6-1.1-4.6-5a3.9 3.9 0 0 1 1-2.7 3.6 3.6 0 0 1 .1-2.7s.8-.3 2.8 1a9.6 9.6 0 0 1 5 0c1.9-1.3 2.8-1 2.8-1 .5 1.4.2 2.4.1 2.7a3.9 3.9 0 0 1 1 2.7c0 3.9-2.4 4.7-4.6 5 .4.3.7.9.7 1.9v2.8c0 .3.2.6.7.5A10 10 0 0 0 12 2Z"/></svg>
      Entrar con GitHub
    </a>
    ${opts.devLogin ? html`<a class="btn btn--linea" href="/auth/dev">Entrar en modo local (solo en tu computador)</a>` : ''}
    <a class="acceso__volver" href="/">${icon('arrowLeft', 16)} Volver a la tienda</a>
  </main>
</body></html>`;
}

export function adminShell(s: Settings, user: { login: string; name: string; avatar: string }, store: StoreInfo) {
  return html`<!doctype html>
<html lang="es-CO" data-theme="light"><head>${head(s, 'Panel')}</head>
<body>
<div class="app" id="app" data-user='${raw(JSON.stringify(user).replace(/'/g, '&#39;').replace(/</g, '\\u003c'))}' data-store='${raw(JSON.stringify(store).replace(/'/g, '&#39;').replace(/</g, '\\u003c'))}'>
  <p class="app__cargando">Cargando el panel…</p>
</div>
<noscript><p class="app__cargando">El panel necesita JavaScript activado.</p></noscript>
<script type="module" src="/admin-app/admin.js?v=4"></script>
</body></html>`;
}
