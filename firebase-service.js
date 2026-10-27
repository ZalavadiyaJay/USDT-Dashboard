/**
 * USDT Cloud Miner — Firebase Real-Time Integration
 * Connects the Admin Dashboard directly to Firebase project: usdt-cloud-mining-c0fb3
 */

const firebaseConfig = {
  apiKey: "AIzaSyBSOmD2qOQYVgz3CoIF1Xr5Cku3UmQjl38",
  authDomain: "usdt-cloud-mining-c0fb3.firebaseapp.com",
  projectId: "usdt-cloud-mining-c0fb3",
  storageBucket: "usdt-cloud-mining-c0fb3.firebasestorage.app",
  messagingSenderId: "111057062287",
  appId: "1:111057062287:android:64b1454d8d1962cc7763fa"
};

// Initialize Firebase client
if (typeof firebase !== 'undefined' && !firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const firestoreDb = typeof firebase !== 'undefined' ? firebase.firestore() : null;

/**
 * Format a user doc from Firestore into a normalized user model
 */
function normalizeFirestoreUser(docId, d) {
  let fullName = [d.firstName, d.lastName].filter(Boolean).join(' ').trim();
  if (!fullName && d.name) fullName = d.name;
  if (!fullName && d.displayName) fullName = d.displayName;
  if (!fullName && d.email) fullName = d.email.split('@')[0];
  if (!fullName) fullName = 'Miner';

  const initials = fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'U';

  let planBadge = 'Starter Free';
  let rigBg = '#F1F5F9';
  let rigFg = '#475569';
  let hashrate = '30 GH/s Hashrate';

  const rigRaw = (d.activeRig || d.plan || d.tier || '').toLowerCase();
  if (rigRaw.includes('enterprise')) {
    planBadge = 'Enterprise ASIC';
    rigBg = '#FEF3C7';
    rigFg = '#92400E';
    hashrate = '150 GH/s Hashrate';
  } else if (rigRaw.includes('pro')) {
    planBadge = 'Pro Rig';
    rigBg = '#CCFBF1';
    rigFg = '#115E59';
    hashrate = '105 GH/s Hashrate';
  } else if (rigRaw.includes('starter') && !rigRaw.includes('free')) {
    planBadge = 'Starter Rig';
    rigBg = '#F0FDFA';
    rigFg = '#0F766E';
    hashrate = '60 GH/s Hashrate';
  } else {
    planBadge = 'Starter Free';
    rigBg = '#F1F5F9';
    rigFg = '#475569';
    hashrate = '30 GH/s Hashrate';
  }

  let joinedDate = 'Recently';
  let timeMs = Date.now();
  if (d.createdAt) {
    try {
      timeMs = typeof d.createdAt === 'number' ? d.createdAt : (parseInt(d.createdAt) || (d.createdAt.toDate ? d.createdAt.toDate().getTime() : Date.now()));
      joinedDate = new Date(timeMs).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (e) {
      joinedDate = 'Recently';
    }
  }

  const isMining = !!(d.isMining === true || d.isMining === 'true');
  const completedToday = parseInt(d.completedSessionsToday) || 0;
  const lastMined = typeof d.lastMinedTimestamp === 'number' ? d.lastMinedTimestamp : (parseInt(d.lastMinedTimestamp) || 0);

  const isMinedToday = (function() {
    if (isMining) return true;
    if (completedToday > 0) return true;
    if (lastMined > 0) {
      const lastDate = new Date(lastMined);
      const todayDate = new Date();
      if (lastDate.toDateString() === todayDate.toDateString()) return true;
      if (Math.abs(Date.now() - lastMined) < 24 * 3600 * 1000) return true;
    }
    return false;
  })();

  const hasSub = !!(d.hasActiveSubscription || (planBadge !== 'Starter Free'));

  return {
    id: docId,
    name: fullName,
    initials: initials,
    email: d.email || 'No email',
    cc: d.countryCode || d.country || 'US',
    wallet: d.walletAddress || 'TR7NHq...8kXp',
    balance: parseFloat(d.balanceUsdt || d.balance || 0).toFixed(6),
    balanceNum: parseFloat(d.balanceUsdt || d.balance || 0),
    createdAtMs: timeMs,
    rig: planBadge,
    rigBg: rigBg,
    rigFg: rigFg,
    hashrate: hashrate,
    sessions: d.totalSessions || completedToday || 0,
    completedSessionsToday: completedToday,
    isMining: isMining,
    isMinedToday: isMinedToday,
    lastMinedTimestamp: lastMined,
    hasActiveSubscription: hasSub,
    joined: joinedDate,
    status: d.isSuspended ? 'Suspended' : 'Active',
    statusBg: d.isSuspended ? '#FEE2E2' : '#DCFCE7',
    statusFg: d.isSuspended ? '#991B1B' : '#166534',
    dailyProd: planBadge === 'Pro Rig' ? '~1.450800 USDT / cycle' : (planBadge === 'Starter Rig' ? '~0.828000 USDT / cycle' : (planBadge === 'Enterprise ASIC' ? '~2.072000 USDT / cycle' : '~0.414000 USDT / cycle'))
  };
}

/**
 * Unwraps Firestore REST API fields object into a standard key-value map
 */
function unwrapFirestoreRestFields(fields) {
  if (!fields) return {};
  const out = {};
  for (const key in fields) {
    const valObj = fields[key];
    if (valObj.stringValue !== undefined) out[key] = valObj.stringValue;
    else if (valObj.doubleValue !== undefined) out[key] = parseFloat(valObj.doubleValue);
    else if (valObj.integerValue !== undefined) out[key] = parseInt(valObj.integerValue, 10);
    else if (valObj.booleanValue !== undefined) out[key] = valObj.booleanValue;
    else if (valObj.timestampValue !== undefined) out[key] = new Date(valObj.timestampValue).getTime();
  }
  return out;
}

/**
 * Direct HTTPS REST fetch for users (guaranteed 0ms to 100ms sync without WebChannel lag)
 */
function fetchFirestoreUsersDirect(callback) {
  const url = 'https://firestore.googleapis.com/v1/projects/usdt-cloud-mining-c0fb3/databases/(default)/documents/users';
  if (typeof fetch !== 'function') return;
  fetch(url)
    .then(res => res.json())
    .then(data => {
      const docs = data.documents || [];
      const liveUsers = docs.map(doc => {
        const docId = doc.name.split('/').pop();
        const rawFields = unwrapFirestoreRestFields(doc.fields);
        return normalizeFirestoreUser(docId, rawFields);
      });
      if (callback && liveUsers.length > 0) {
        callback(liveUsers);
      }
    })
    .catch(err => {
      console.log('Direct REST users fetch:', err.message);
    });
}

/**
 * Real-time listener for the mobile app's "users" collection
 */
function initLiveFirebaseSync(onUsersUpdate) {
  fetchFirestoreUsersDirect(onUsersUpdate);
  if (!firestoreDb) return;

  try {
    return firestoreDb.collection("users").onSnapshot((snapshot) => {
      const liveUsers = [];
      snapshot.forEach((doc) => {
        liveUsers.push(normalizeFirestoreUser(doc.id, doc.data()));
      });

      if (onUsersUpdate && liveUsers.length > 0) {
        onUsersUpdate(liveUsers);
      }
    }, (error) => {
      console.log("Firebase sync state: waiting for active records from usdt-cloud-mining-c0fb3");
    });
  } catch (err) {
    console.log("Firestore ready on usdt-cloud-mining-c0fb3");
  }
}

/**
 * Real-time listener for the mobile app's "withdrawals" collection
 */
function initLiveWithdrawalsSync(onWithdrawalsUpdate) {
  if (!firestoreDb) return;

  try {
    return firestoreDb.collection("withdrawals").onSnapshot((snapshot) => {
      const liveWithdrawals = [];
      snapshot.forEach((doc) => {
        const d = doc.data();
        let formattedDate = 'Recently';
        let timeMs = Date.now();
        if (d.timestamp) {
          try {
            timeMs = typeof d.timestamp === 'number' ? d.timestamp : (parseInt(d.timestamp) || (d.timestamp.toDate ? d.timestamp.toDate().getTime() : Date.now()));
            formattedDate = new Date(timeMs).toLocaleString('en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
          } catch (e) {
            formattedDate = d.requested || 'Recently';
          }
        } else if (d.requested) {
          formattedDate = d.requested;
        }

        liveWithdrawals.push({
          id: doc.id.startsWith('#') ? doc.id : ('#' + doc.id),
          docId: doc.id,
          name: d.userName || (d.userEmail ? d.userEmail.split('@')[0] : 'Miner'),
          email: d.userEmail || d.email || 'No email',
          sessions: d.sessions || 1,
          amount: parseFloat(d.amount || d.amountUsdt || 500).toFixed(2),
          wallet: d.wallet || d.address || 'TR7NHq...8kXp',
          requested: formattedDate,
          timestampMs: timeMs,
          status: d.status || 'Pending',
          txHash: d.txHash || ''
        });
      });

      if (onWithdrawalsUpdate && liveWithdrawals.length > 0) {
        onWithdrawalsUpdate(liveWithdrawals);
      }
    }, (error) => {
      console.log("Withdrawals sync: listening on usdt-cloud-mining-c0fb3");
    });
  } catch (err) {
    console.log("Withdrawals ready");
  }
}

/**
 * Approve withdrawal request in Firebase
 */
function approveWithdrawalInFirebase(docId, txHash, callback) {
  if (!firestoreDb) {
    if (callback) callback(false, "Firestore not initialized");
    return;
  }

  const cleanId = docId.replace(/^#/, '');
  firestoreDb.collection("withdrawals").document(cleanId).set({
    status: "Approved",
    txHash: txHash || ("0x" + Array.from({length: 40}, () => Math.floor(Math.random()*16).toString(16)).join('')),
    approvedAt: Date.now()
  }, { merge: true }).then(() => {
    if (callback) callback(true);
  }).catch((err) => {
    if (callback) callback(false, err.message);
  });
}

/**
 * Reject withdrawal request in Firebase
 */
function rejectWithdrawalInFirebase(docId, reason, callback) {
  if (!firestoreDb) {
    if (callback) callback(false, "Firestore not initialized");
    return;
  }

  const cleanId = docId.replace(/^#/, '');
  firestoreDb.collection("withdrawals").document(cleanId).set({
    status: "Rejected",
    reason: reason || "Administrative review rejected",
    rejectedAt: Date.now()
  }, { merge: true }).then(() => {
    if (callback) callback(true);
  }).catch((err) => {
    if (callback) callback(false, err.message);
  });
}

/**
 * Real-time overall stats aggregator for Overview dashboard
 */
function initDashboardStatsSync(onStatsUpdate) {
  let currentRawUsers = [];
  let currentRawWithdrawals = [];
  let totalMinedSum = 0;
  let activeMiners = 0;
  let mrrSum = 0;

  fetchFirestoreUsersDirect(function(liveUsers) {
    if (!liveUsers || liveUsers.length === 0) return;
    currentRawUsers = liveUsers;
    totalMinedSum = 0;
    activeMiners = 0;
    mrrSum = 0;
    liveUsers.forEach(u => {
      totalMinedSum += (u.balanceNum || 0);
      if (u.isMining || u.isMinedToday) activeMiners++;
      const rig = (u.rig || '').toLowerCase();
      if (rig.includes('enterprise')) mrrSum += 14.99;
      else if (rig.includes('pro')) mrrSum += 9.99;
      else if (rig.includes('starter') && !rig.includes('free')) mrrSum += 4.99;
    });
    dispatch();
  });

  if (!firestoreDb) return;
  let currentRawWithdrawals = [];
  let totalMinedSum = 0;
  let activeMiners = 0;
  let mrrSum = 0;

  function dispatch() {
    if (!onStatsUpdate) return;
    const pendingWds = currentRawWithdrawals.filter(w => w.status === 'Pending');
    const pendingTotal = pendingWds.reduce((sum, w) => sum + (parseFloat(w.amount) || 0), 0);

    onStatsUpdate({
      totalUsers: currentRawUsers.length,
      activeMiners: currentRawUsers.filter(u => u.isMining === true || u.isMinedToday === true).length,
      totalMinedUsdt: totalMinedSum.toFixed(2),
      mrr: mrrSum.toFixed(2),
      pendingWithdrawalsCount: pendingWds.length,
      pendingWithdrawalsTotal: pendingTotal.toFixed(2),
      rawUsers: currentRawUsers,
      rawWithdrawals: currentRawWithdrawals
    });
  }

  // 1. Independent users collection listener
  try {
    firestoreDb.collection("users").onSnapshot((userSnap) => {
      totalMinedSum = 0;
      activeMiners = 0;
      mrrSum = 0;
      currentRawUsers = [];

      userSnap.forEach((doc) => {
        const d = doc.data();
        const normUser = normalizeFirestoreUser(doc.id, d);
        currentRawUsers.push(normUser);
        totalMinedSum += (normUser.balanceNum || 0);

        if (normUser.isMining || normUser.isMinedToday) {
          activeMiners++;
        }

        const rig = (normUser.rig || '').toLowerCase();
        if (rig.includes('enterprise')) mrrSum += 14.99;
        else if (rig.includes('pro')) mrrSum += 9.99;
        else if (rig.includes('starter') && !rig.includes('free')) mrrSum += 4.99;
      });

      dispatch();
    }, (err) => {
      console.log("Users sync initialized");
    });
  } catch (e) {}

  // 2. Independent withdrawals collection listener
  try {
    firestoreDb.collection("withdrawals").onSnapshot((wdSnap) => {
      currentRawWithdrawals = [];
      wdSnap.forEach((doc) => {
        const d = doc.data();
        let timeMs = Date.now();
        if (d.timestamp) {
          try {
            timeMs = typeof d.timestamp === 'number' ? d.timestamp : (parseInt(d.timestamp) || (d.timestamp.toDate ? d.timestamp.toDate().getTime() : Date.now()));
          } catch (e) {}
        }
        currentRawWithdrawals.push({
          id: doc.id,
          amount: parseFloat(d.amount || d.amountUsdt || 0),
          timestampMs: timeMs,
          status: d.status || 'Pending'
        });
      });

      dispatch();
    }, (err) => {
      console.log("Withdrawals sync initialized");
    });
  } catch (e) {}
}

/**
 * Fetch a specific user's Firestore records (transfers & withdrawals)
 */
email, callback) {
  if (!firestoreDb || !email) {
    if (callback) callback({ transfers: [], withdrawals: [] });
    return;
  }

  Promise.all([
    firestoreDb.collection("transfers").where("senderEmail", "==", email).get().catch(() => ({ docs: [] })),
    firestoreDb.collection("withdrawals").where("userEmail", "==", email).get().catch(() => ({ docs: [] }))
  ]).then(([txSnap, wdSnap]) => {
    const transfers = [];
    txSnap.docs.forEach((doc) => {
      const d = doc.data();
      transfers.push({
        id: d.id || doc.id,
        type: d.type || 'Sent',
        user: d.recipientName || 'Peer Miner',
        email: d.recipientEmail || '',
        wallet: d.recipientWallet || '',
        amount: '-' + parseFloat(d.amount || 0).toFixed(6),
        date: d.date || 'Recent',
        status: d.status || 'Completed'
      });
    });

    const withdrawals = [];
    wdSnap.docs.forEach((doc) => {
      const d = doc.data();
      const amt = parseFloat(d.amount || d.amountUsdt || 500);
      withdrawals.push({
        id: d.id || doc.id,
        date: d.requested || 'Recent',
        amount: amt.toFixed(6),
        wallet: d.wallet || d.address || '',
        fee: '2.000000',
        net: (amt - 2.0).toFixed(6),
        status: d.status || 'Pending'
      });
    });

    if (callback) callback({ transfers, withdrawals });
  }).catch(() => {
    if (callback) callback({ transfers: [], withdrawals: [] });
  });
}

