/**
 * USDT Cloud Miner — Security Auth Guard
 * Verifies server-side session and manages logout
 */
(function() {
  // Verify session with server
  fetch('/api/session', { cache: 'no-store' })
    .then(response => {
      if (!response.ok) {
        window.location.replace('/login.html');
      }
      return response.json();
    })
    .then(data => {
      if (!data || !data.authenticated) {
        window.location.replace('/login.html');
      }
    })
    .catch(() => {
      // In case server is unreachable or forbidden
      window.location.replace('/login.html');
    });

  // Global logout handler
  document.addEventListener('click', function(e) {
    const logoutBtn = e.target.closest('[data-action="logout"]');
    if (logoutBtn) {
      e.preventDefault();
      fetch('/api/logout', { method: 'POST' })
        .finally(() => {
          window.location.replace('/login.html');
        });
    }
  });
})();
