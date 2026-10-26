/**
 * USDT Cloud Miner — Security Auth Guard
 * Verifies session (hybrid: server API + static fallback)
 */
(function() {
  const SESSION_KEY = 'usdt_admin_session';
  const LOCAL_ACTIVE_KEY = 'usdt_admin_session_active';
  const ADMIN_EMAIL = 'zalavadiyajay3814@gmail.com';

  function isAuthenticatedLocally() {
    try {
      const sess = sessionStorage.getItem(SESSION_KEY);
      if (sess) {
        const parsed = JSON.parse(sess);
        if (parsed && parsed.email && parsed.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
          return true;
        }
      }
      if (localStorage.getItem(LOCAL_ACTIVE_KEY) === 'true') {
        return true;
      }
    } catch (e) {}
    return false;
  }

  function redirectToLogin() {
    try {
      sessionStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(LOCAL_ACTIVE_KEY);
    } catch (e) {}
    window.location.replace('/login.html');
  }

  // Check server session if available
  fetch('/api/session', { cache: 'no-store' })
    .then(response => {
      if (response.ok) {
        return response.json().then(data => {
          if (!data || !data.authenticated) {
            redirectToLogin();
          }
        });
      } else if (response.status === 401) {
        // Explicitly unauthenticated by server
        redirectToLogin();
      } else if (response.status === 404) {
        // Static hosting environment (Cloudflare Pages CDN)
        if (!isAuthenticatedLocally()) {
          redirectToLogin();
        }
      }
    })
    .catch(() => {
      // Offline or network error: check local session
      if (!isAuthenticatedLocally()) {
        redirectToLogin();
      }
    });

  // Global logout handler
  document.addEventListener('click', function(e) {
    const logoutBtn = e.target.closest('[data-action="logout"]');
    if (logoutBtn) {
      e.preventDefault();
      try {
        sessionStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(LOCAL_ACTIVE_KEY);
      } catch (err) {}
      fetch('/api/logout', { method: 'POST' }).finally(() => {
        window.location.replace('/login.html');
      });
    }
  });
})();
