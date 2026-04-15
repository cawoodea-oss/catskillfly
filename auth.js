// ── auth.js — shared session management for Catskill Fly ──
// Include on every page: <script src="auth.js"></script>

const SUPABASE_URL = 'https://csdahuhrsxeumqmjsidw.supabase.co';
const SUPABASE_KEY = 'sb_publishable_gWCvq372JoF8aoUQIcz-zw_eLV_NoDc';

// ── Get current session from localStorage ──
function getSession() {
  try {
    const s = localStorage.getItem('sb_session');
    return s ? JSON.parse(s) : null;
  } catch(e) { return null; }
}

// ── Save session ──
function saveSession(session) {
  localStorage.setItem('sb_session', JSON.stringify(session));
}

// ── Clear session and redirect to login ──
function signOut() {
  localStorage.removeItem('sb_session');
  window.location.href = 'login.html';
}

// ── Check if token is expired or about to expire (within 5 min) ──
function tokenNeedsRefresh(session) {
  if (!session?.expires_at) return false;
  const expiresAt = session.expires_at * 1000; // convert to ms
  return Date.now() > expiresAt - 5 * 60 * 1000;
}

// ── Refresh the access token using the refresh token ──
async function refreshSession(session) {
  if (!session?.refresh_token) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY },
      body: JSON.stringify({ refresh_token: session.refresh_token })
    });
    if (!res.ok) return null;
    const newSession = await res.json();
    saveSession(newSession);
    return newSession;
  } catch(e) {
    console.warn('Token refresh failed:', e);
    return null;
  }
}

// ── Get a valid session — refreshes automatically if needed ──
// Use this instead of getSession() anywhere you need an auth token
async function getValidSession() {
  let session = getSession();
  if (!session?.access_token) return null;

  if (tokenNeedsRefresh(session)) {
    const refreshed = await refreshSession(session);
    if (refreshed?.access_token) return refreshed;
    // Refresh failed — session is dead
    localStorage.removeItem('sb_session');
    return null;
  }
  return session;
}

// ── Require auth — redirect to login if no valid session ──
// Call at top of any page that requires login
async function requireAuth() {
  const session = await getValidSession();
  if (!session) {
    window.location.href = 'login.html';
    return null;
  }
  return session;
}

// ── Auto-refresh in the background every 4 minutes ──
// Call once on pages that need persistent sessions
function startAutoRefresh() {
  setInterval(async () => {
    const session = getSession();
    if (session && tokenNeedsRefresh(session)) {
      await refreshSession(session);
    }
  }, 4 * 60 * 1000);
}

// ── Get display name for current user ──
function getDisplayName(session) {
  if (!session?.user) return 'Angler';
  return session.user.user_metadata?.display_name
    || session.user.email?.split('@')[0]
    || 'Angler';
}
