/**
 * USDT Cloud Miner — Admin Dashboard Application Script
 */

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initSearchAndShortcuts();
  initUserFilters();
  initWithdrawalsQueue();
  initNotificationBroadcast();
  initSettingsForm();
  initDateFilters();
});

// ==========================================
// 1. Toast Notification System
// ==========================================
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast-item';
  const bgColor = type === 'success' ? '#0F766E' : (type === 'error' ? '#EF4444' : '#0F172A');
  const icon = type === 'success' ? '[OK]' : (type === 'error' ? '[X]' : '[i]');

  toast.style.cssText = `
    background: ${bgColor};
    color: #FFFFFF;
    padding: 12px 20px;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 600;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    display: flex;
    align-items: center;
    gap: 10px;
    pointer-events: auto;
    min-width: 280px;
    max-width: 420px;
  `;

  toast.innerHTML = `
    <span style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;background:rgba(255,255,255,0.2);border-radius:50%;font-size:11px;">${icon}</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'all 0.3s ease';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ==========================================
// 2. Navigation Architecture
// ==========================================
function initNavigation() {
  const navLinks = document.querySelectorAll('.nav-tab-link');
  const tabViews = document.querySelectorAll('.tab-view');

  function switchTab(targetTab) {
    if (!targetTab) targetTab = 'dashboard';

    // Update active nav styling
    navLinks.forEach(link => {
      const tab = link.getAttribute('data-tab');
      if (tab === targetTab) {
        link.classList.add('active');
        link.style.background = '#CCFBF1';
        link.style.color = '#115E59';
        link.style.fontWeight = '600';
        const svg = link.querySelector('svg');
        if (svg) svg.style.stroke = '#115E59';
      } else {
        link.classList.remove('active');
        link.style.background = 'transparent';
        link.style.color = '#475569';
        link.style.fontWeight = '500';
        const svg = link.querySelector('svg');
        if (svg) svg.style.stroke = 'currentColor';
      }
    });

    // Toggle views
    tabViews.forEach(view => {
      if (view.id === `view-${targetTab}`) {
        view.style.display = 'block';
      } else {
        view.style.display = 'none';
      }
    });

    // Sync window hash
    if (window.location.hash !== `#${targetTab}`) {
      history.replaceState(null, null, `#${targetTab}`);
    }
  }

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const tab = link.getAttribute('data-tab');
      switchTab(tab);
    });
  });

  // Check initial hash
  const currentHash = window.location.hash.replace('#', '');
  if (currentHash && document.getElementById(`view-${currentHash}`)) {
    switchTab(currentHash);
  } else {
    switchTab('dashboard');
  }

  window.addEventListener('hashchange', () => {
    const hash = window.location.hash.replace('#', '');
    if (hash && document.getElementById(`view-${hash}`)) {
      switchTab(hash);
    }
  });
}

// ==========================================
// 3. Search and Keyboard Shortcuts
// ==========================================
function initSearchAndShortcuts() {
  // Global Cmd+K or Ctrl+K shortcut
  window.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      const visibleSearch = document.querySelector('.tab-view:not([style*="display: none"]) input[type="search"], .tab-view:not([style*="display: none"]) input[placeholder*="Search"]');
      if (visibleSearch) {
        visibleSearch.focus();
        visibleSearch.select();
      }
    }
  });

  // Copy buttons on wallets
  document.querySelectorAll('button, a, span').forEach(el => {
    if (el.textContent.trim().toLowerCase() === 'copy' || el.getAttribute('aria-label') === 'Copy address') {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const tr = el.closest('tr') || el.closest('article') || el.parentElement;
        const walletText = tr ? (tr.querySelector('[data-wallet]')?.textContent || 'TR7NHqJEKQxGTCi8q8ZY4pL8otSzgjLj6t') : 'TR7NHqJEKQxGTCi8q8ZY4pL8otSzgjLj6t';
        navigator.clipboard.writeText(walletText).then(() => {
          showToast(`Copied wallet address (${walletText.slice(0, 10)}...) to clipboard`);
        }).catch(() => {
          showToast('Address copied');
        });
      });
    }
  });
}

// ==========================================
// 4. User Directory Filtering & Search
// ==========================================
function initUserFilters() {
  const usersView = document.getElementById('view-users');
  if (!usersView) return;

  const searchInput = usersView.querySelector('input[type="search"]') || usersView.querySelector('input[placeholder*="Search"]');
  const table = usersView.querySelector('table');
  if (!table) return;

  const rows = Array.from(table.querySelectorAll('tbody tr'));
  let currentSegment = 'all';

  // Segment Tab Buttons (All users, Starter Rig, Pro Rig, Enterprise ASIC)
  const segmentTabs = usersView.querySelectorAll('button, [role="tab"]');
  segmentTabs.forEach(btn => {
    const txt = btn.textContent.toLowerCase();
    if (txt.includes('all') || txt.includes('starter') || txt.includes('pro') || txt.includes('enterprise')) {
      btn.classList.add('user-filter-tab');
      btn.addEventListener('click', () => {
        segmentTabs.forEach(b => {
          b.classList.remove('active');
          b.style.background = '#FFFFFF';
          b.style.fontWeight = '500';
          b.style.color = '#334155';
          b.style.borderColor = '#CBD5E1';
        });
        btn.classList.add('active');
        btn.style.background = '#0F766E';
        btn.style.color = '#FFFFFF';
        btn.style.borderColor = '#0F766E';
        btn.style.fontWeight = '600';

        if (txt.includes('starter')) currentSegment = 'starter';
        else if (txt.includes('pro')) currentSegment = 'pro';
        else if (txt.includes('enterprise')) currentSegment = 'enterprise';
        else currentSegment = 'all';

        filterUserRows();
      });
    }
  });

  function filterUserRows() {
    const query = (searchInput ? searchInput.value : '').toLowerCase().trim();

    rows.forEach(row => {
      const text = row.textContent.toLowerCase();

      let matchesSegment = true;
      if (currentSegment === 'starter') matchesSegment = text.includes('starter');
      else if (currentSegment === 'pro') matchesSegment = text.includes('pro');
      else if (currentSegment === 'enterprise') matchesSegment = text.includes('enterprise');

      const matchesQuery = !query || text.includes(query);

      if (matchesSegment && matchesQuery) {
        row.style.display = '';
      } else {
        row.style.display = 'none';
      }
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', filterUserRows);
  }
}

// ==========================================
// 5. Crypto Withdrawals Verification Queue
// ==========================================
function initWithdrawalsQueue() {
  const wdView = document.getElementById('view-withdrawals');
  if (!wdView) return;

  const modal = document.getElementById('wd-modal');
  const modalTitle = document.getElementById('wd-modal-title');
  const modalBody = document.getElementById('wd-modal-body');
  const modalConfirm = document.getElementById('wd-modal-confirm');
  const modalCancel = document.getElementById('wd-modal-cancel');
  const modalClose = document.getElementById('wd-modal-close');

  let activeArticle = null;

  function closeModal() {
    if (modal) modal.style.display = 'none';
    activeArticle = null;
  }

  if (modalClose) modalClose.addEventListener('click', closeModal);
  if (modalCancel) modalCancel.addEventListener('click', closeModal);

  // Scan all approve & reject buttons in withdrawals view
  wdView.querySelectorAll('button').forEach(btn => {
    const text = btn.textContent.toLowerCase().trim();
    const article = btn.closest('article');

    if (text.includes('approve') || text.includes('mark paid')) {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        activeArticle = article;
        const userName = article ? (article.querySelector('h3, div[style*="font-weight: 700"]')?.textContent.trim() || 'Miner') : 'Miner';
        const amount = article ? (article.querySelector('div[style*="font-size: 20px"], div[style*="font-size: 18px"]')?.textContent.trim() || '500.00 USDT') : '500.00 USDT';
        const wallet = article ? (article.querySelector('code, span[style*="font-family"]')?.textContent.trim() || 'TR7NHq…8kXp') : 'TR7NHq…8kXp';

        if (modal && modalBody) {
          modalTitle.textContent = `Approve Payout — ${userName}`;
          modalBody.innerHTML = `
            <div><strong>Amount:</strong> <span style="color:#0F766E;font-size:16px;font-weight:700">${amount}</span></div>
            <div><strong>Destination Network:</strong> <span style="background:#F0FDFA;color:#0F766E;padding:2px 8px;border-radius:6px;font-size:12px;font-weight:600">TRC-20 (Tron)</span></div>
            <div><strong>Wallet Address:</strong> <code style="background:#F1F5F9;padding:4px 8px;border-radius:6px;">${wallet}</code></div>
            <div style="display:flex;flex-direction:column;gap:6px;margin-top:8px;">
              <label style="font-size:12px;font-weight:600;color:#0F172A">Blockchain Transaction Hash (TxID):</label>
              <input type="text" id="wd-txid-input" placeholder="e.g. 7c3f81e09581c828d11c798031e..." value="7c3f81e09581c828d11c798031e92d8f993d0a" style="padding:10px 12px;border:1px solid #CBD5E1;border-radius:8px;font-size:13px;font-family:monospace;width:100%;">
            </div>
          `;
          modal.style.display = 'flex';
        } else {
          markApproved(article);
        }
      });
    } else if (text.includes('reject')) {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (confirm('Are you sure you want to reject this withdrawal request and refund the balance back to the miner?')) {
          if (article) {
            article.style.opacity = '0.5';
            btn.parentElement.innerHTML = '<span style="font-size:12px;font-weight:700;color:#991B1B;background:#FEE2E2;padding:6px 12px;border-radius:8px;">Rejected & Refunded</span>';
          }
          showToast('Withdrawal request rejected and refunded', 'error');
          decrementBadge();
        }
      });
    }
  });

  if (modalConfirm) {
    modalConfirm.addEventListener('click', () => {
      const txid = document.getElementById('wd-txid-input')?.value || '7c3f81e0...';
      if (activeArticle) {
        markApproved(activeArticle, txid);
      }
      closeModal();
    });
  }

  function markApproved(article, txid = '7c3f81e09581c8...') {
    if (article) {
      const actionsDiv = article.querySelector('div[style*="justify-content: flex-end"], div[style*="gap: 12px"]');
      if (actionsDiv) {
        actionsDiv.innerHTML = `
          <div style="display:flex;align-items:center;gap:8px;font-size:12px;font-weight:700;color:#166534;background:#DCFCE7;padding:6px 14px;border-radius:8px;">
            <span>Paid on-chain</span>
            <span style="font-weight:400;color:#15803D;font-family:monospace">Tx: ${txid.slice(0, 10)}…</span>
          </div>
        `;
      }
    }
    showToast(`Payout approved and marked paid on TRC-20`);
    decrementBadge();
  }

  function decrementBadge() {
    const badges = document.querySelectorAll('.nav-badge');
    badges.forEach(b => {
      let count = parseInt(b.textContent.trim()) || 0;
      if (count > 1) {
        b.textContent = count - 1;
      } else {
        b.remove();
      }
    });
  }
}

// ==========================================
// 6. Push Notification Broadcast Console
// ==========================================
function initNotificationBroadcast() {
  const notifView = document.getElementById('view-notifications');
  if (!notifView) return;

  const broadcastBtn = notifView.querySelector('button[style*="#0F766E"], button:has(svg)');
  const titleInput = notifView.querySelector('input[type="text"]') || notifView.querySelector('input:not([type="radio"])');
  const bodyTextarea = notifView.querySelector('textarea');
  const campaignsTable = notifView.querySelector('table tbody');

  if (broadcastBtn) {
    broadcastBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const title = titleInput?.value.trim() || 'Mining Rig Idle - Harvest Ready!';
      const body = bodyTextarea?.value.trim() || 'Your cloud node has finished its 30-minute session. Tap now to collect USDT and boost speed!';

      let selectedAudience = 'All app users';
      const checkedRadio = notifView.querySelector('input[type="radio"]:checked');
      if (checkedRadio) {
        const label = checkedRadio.closest('label')?.textContent.trim().split('\n')[0];
        if (label) selectedAudience = label;
      }

      broadcastBtn.disabled = true;
      broadcastBtn.textContent = 'Broadcasting...';

      setTimeout(() => {
        broadcastBtn.disabled = false;
        broadcastBtn.textContent = 'Broadcast notification';

        showToast(`Broadcast sent to ${selectedAudience}! (${title})`);

        // Append to campaigns table
        if (campaignsTable) {
          const now = new Date();
          const timeStr = `${now.getDate()} Oct ${now.getFullYear()}, ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
          const tr = document.createElement('tr');
          tr.style.cssText = 'border-bottom: 1px solid #F1F5F9;';
          tr.innerHTML = `
            <td style="padding: 16px 20px; font-weight: 600; color: #0F172A;">${title}</td>
            <td style="padding: 16px 20px; color: #64748B;">${selectedAudience}</td>
            <td style="padding: 16px 20px; color: #64748B; font-size: 13px;">${timeStr}</td>
            <td style="padding: 16px 20px; font-weight: 600; color: #0F172A;">43,158</td>
            <td style="padding: 16px 20px;">
              <div style="display:flex;align-items:center;gap:8px;">
                <div style="flex:1;height:6px;background:#E2E8F0;border-radius:999px;overflow:hidden;min-width:60px;">
                  <div style="width:100%;height:100%;background:#0F766E;border-radius:999px;"></div>
                </div>
                <span style="font-size:12px;font-weight:600;color:#0F766E">100%</span>
              </div>
            </td>
          `;
          campaignsTable.insertBefore(tr, campaignsTable.firstChild);
        }
      }, 600);
    });
  }
}

// ==========================================
// 7. Settings Form
// ==========================================
function initSettingsForm() {
  const settingsView = document.getElementById('view-settings');
  if (!settingsView) return;

  const saveBtns = settingsView.querySelectorAll('button');
  saveBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      showToast('Platform configuration saved successfully');
    });
  });
}

// ==========================================
// 8. Date Range Filters
// ==========================================
function initDateFilters() {
  document.querySelectorAll('select').forEach(select => {
    const opts = Array.from(select.options).map(o => o.text.toLowerCase());
    if (opts.some(o => o.includes('today') || o.includes('yesterday') || o.includes('days') || o.includes('month'))) {
      select.addEventListener('change', () => {
        showToast(`Filtered metrics by: ${select.value || select.options[select.selectedIndex].text}`);
      });
    }
  });
}
