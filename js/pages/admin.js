// Admin page entry point - admin.html
import { fetchSection, createEntry, getToken } from '../shared/api.js';
import { showToast } from '../shared/notifications.js';
import { showPasswordGate, setupLogout } from '../shared/auth.js';
import { renderItems } from '../sections/items.js';
import { renderWallet } from '../sections/wallet.js';
import { renderPerson } from '../sections/person.js';
import { renderMaintenance } from '../sections/maintenance.js';
import { renderSamples } from '../sections/samples.js';
import { renderClipping } from '../sections/clipping.js';
import { initTheme } from '../shared/theme.js';
import { sendViaBot } from '../shared/utils.js';

// Initialize theme toggle
initTheme();

const SECTIONS = ['items', 'wallet', 'person', 'maintenance', 'samples', 'clipping'];

// ==================== WhatsApp Direct Notify ====================
const WA_TARGET = '923244643714';

function buildWhatsAppMessage(section, entry) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', hour12:true });
  const line = '══════════════════════════════';

  let title = '', body = '';

  switch (section) {
    case 'items':
      title = '📦 ✦ *NEW ITEM ADDED* ✦ 📦';
      body = `📋 *Name:* ${entry.name}\n🔢 *Serial:* ${entry.number || 'N/A'}\n👤 *Person:* ${entry.person || 'N/A'}\n📐 *Model:* ${entry.model || 'N/A'}`;
      break;
    case 'wallet':
      title = entry.type === 'in'
        ? '💰 ✦ *MONEY RECEIVED* ✦ 💰'
        : '💸 ✦ *MONEY SPENT* ✦ 💸';
      body = `${entry.type === 'in' ? '📥 *From:*' : '📤 *For:*'} ${entry.personOrPurpose}\n💵 *Amount:* Rs. ${Number(entry.amount).toLocaleString()}`;
      if (entry.balance !== undefined) {
        const balSign = entry.balance >= 0 ? '+' : '-';
        const balLabel = entry.balance >= 0 ? '✅ POSITIVE' : '⚠️ NEGATIVE';
        body += `\n🏦 *Balance:* ${balSign}Rs. ${Math.abs(entry.balance).toLocaleString()} (${balLabel})`;
      }
      break;
    case 'person':
      title = '👷 ✦ *WORKER ADDED* ✦ 👷';
      body = `👤 *Name:* ${entry.personName}\n✅ *Action:* Entry Logged`;
      break;
    case 'maintenance':
      if (entry.status === 'solved') {
        title = '✅ ✦ *ISSUE SOLVED* ✦ ✅';
        body = `🔧 *Type:* ${entry.category}\n📝 *Subject:* ${entry.subject}\n📄 *Desc:* ${entry.description || 'N/A'}\n✅ *Status:* Resolved`;
      } else {
        title = '🔧 ✦ *MAINTENANCE ENTRY* ✦ 🔧';
        body = `🔧 *Type:* ${entry.category}\n📝 *Subject:* ${entry.subject}\n📄 *Desc:* ${entry.description || 'N/A'}`;
      }
      break;
    case 'samples':
      title = entry.type === 'in'
        ? '🧪 ✦ *SAMPLE RECEIVED* ✦ 🧪'
        : '📤 ✦ *SAMPLE SENT* ✦ 📤';
      body = `👤 *Person:* ${entry.personName}\n📋 *Program:* ${entry.program || 'N/A'}\n🔢 *Pieces:* ${entry.pieces || 'N/A'}`;
      break;
    case 'clipping':
      title = '✂️ ✦ *CLIPPING ENTRY* ✦ ✂️';
      body = `✂️ *Clipper:* ${entry.clipperName}\n📏 *Size:* ${entry.size}\n📥 *Type:* ${entry.type === 'in' ? '✅ Clipped In' : '📤 Out for Clipping'}`;
      break;
    default:
      title = `🔔 ✦ *NEW: ${section.toUpperCase()}* ✦ 🔔`;
      body = `➤ ${JSON.stringify(entry)}`;
  }

  const pageUrl = `https://zaidbwp.vercel.app/section.html?page=${section}`;

  return `${title}\n${line}\n${body}\n${line}\n👨‍💻 *ZAID BWP DEVELOPER* 👨‍💻\n📅 ${dateStr}  ⏰ ${timeStr}\n${line}\n🌐 SEE MORE INFO.\n${pageUrl}`;
}

function sendWhatsAppNotify(section, entry) {
  try {
    const msg = buildWhatsAppMessage(section, entry);
    sendViaBot(msg);
  } catch (e) {
    console.error('WhatsApp notify error:', e);
  }
}

// Expose globally so other modules (maintenance.js) can trigger notifications
window.sendWhatsAppNotify = sendWhatsAppNotify;

async function loadSection(section) {
  try {
    const data = await fetchSection(section);
    const container = document.getElementById(`${section}-body`);
    if (!container) return;

    const opts = { isAdmin: true, onRefresh: () => loadAllSections() };

    switch (section) {
      case 'items': renderItems(container, data, opts); break;
      case 'wallet': renderWallet(container, data, opts); break;
      case 'person': renderPerson(container, data, opts); break;
      case 'maintenance': renderMaintenance(container, data, opts); break;
      case 'samples': renderSamples(container, data, opts); break;
      case 'clipping': renderClipping(container, data, opts); break;
    }
  } catch (err) {
    console.error(`Error loading ${section}:`, err);
    const container = document.getElementById(`${section}-body`);
    if (container) {
      container.innerHTML = `<div class="empty-state"><p style="color:var(--danger);">Failed to load ${section}</p></div>`;
    }
  }
}

async function loadAllSections() {
  await Promise.all(SECTIONS.map(s => loadSection(s)));
}

// Form submit handlers
function setupForms() {
  // Items submit
  document.getElementById('items-submit')?.addEventListener('click', async () => {
    const name = document.getElementById('items-name').value.trim();
    if (!name) { showToast('Error', 'Item name is required', 'error'); return; }
    const entryData = {
      name,
      number: document.getElementById('items-number').value.trim(),
      person: document.getElementById('items-person').value.trim(),
      model: document.getElementById('items-model').value.trim()
    };
    try {
      await createEntry('items', entryData);
      document.getElementById('items-name').value = '';
      document.getElementById('items-number').value = '';
      document.getElementById('items-person').value = '';
      document.getElementById('items-model').value = '';
      document.getElementById('items-form-panel').classList.remove('active');
      showToast('Success', 'Item added successfully', 'success');
      sendWhatsAppNotify('items', entryData);
      loadAllSections();
    } catch (err) {
      showToast('Error', err.message, 'error');
    }
  });

  // Wallet submit
  document.getElementById('wallet-submit')?.addEventListener('click', async () => {
    const personOrPurpose = document.getElementById('wallet-person').value.trim();
    const amount = document.getElementById('wallet-amount').value.trim();
    if (!personOrPurpose || !amount) { showToast('Error', 'Please fill all fields', 'error'); return; }
    const entryData = {
      type: window.walletType || 'in',
      personOrPurpose,
      amount: Number(amount)
    };
    try {
      await createEntry('wallet', entryData);
      document.getElementById('wallet-person').value = '';
      document.getElementById('wallet-amount').value = '';
      document.getElementById('wallet-form-panel').classList.remove('active');
      showToast('Success', 'Wallet entry added', 'success');
      // Calculate running balance after new entry
      try {
        const walletData = await fetchSection('wallet');
        const balance = walletData.reduce((acc, e) => acc + (e.type === 'in' ? Number(e.amount) : -Number(e.amount)), 0);
        entryData.balance = balance;
      } catch { /* balance calc failed, send without it */ }
      sendWhatsAppNotify('wallet', entryData);
      loadAllSections();
    } catch (err) {
      showToast('Error', err.message, 'error');
    }
  });

  // Maintenance submit
  document.getElementById('maintenance-submit')?.addEventListener('click', async () => {
    const subject = document.getElementById('maintenance-subject').value.trim();
    if (!subject) { showToast('Error', 'Subject is required', 'error'); return; }
    const activeCat = document.querySelector('#maintenance-categories .category-btn.active');
    const entryData = {
      category: activeCat?.dataset.cat || 'Issue',
      subject,
      description: document.getElementById('maintenance-desc').value.trim()
    };
    try {
      await createEntry('maintenance', entryData);
      document.getElementById('maintenance-subject').value = '';
      document.getElementById('maintenance-desc').value = '';
      document.getElementById('maintenance-form-panel').classList.remove('active');
      showToast('Success', 'Maintenance entry added', 'success');
      sendWhatsAppNotify('maintenance', entryData);
      loadAllSections();
    } catch (err) {
      showToast('Error', err.message, 'error');
    }
  });

  // Samples submit
  document.getElementById('samples-submit')?.addEventListener('click', async () => {
    const person = document.getElementById('samples-person').value.trim();
    if (!person) { showToast('Error', 'Person name is required', 'error'); return; }
    const entryData = {
      type: window.samplesType || 'in',
      personName: person,
      program: document.getElementById('samples-program').value.trim(),
      pieces: document.getElementById('samples-pieces').value.trim()
    };
    try {
      await createEntry('samples', entryData);
      document.getElementById('samples-person').value = '';
      document.getElementById('samples-program').value = '';
      document.getElementById('samples-pieces').value = '';
      document.getElementById('samples-form-panel').classList.remove('active');
      showToast('Success', 'Sample entry added', 'success');
      sendWhatsAppNotify('samples', entryData);
      loadAllSections();
    } catch (err) {
      showToast('Error', err.message, 'error');
    }
  });

  // Person submit (add worker)
  document.getElementById('person-submit')?.addEventListener('click', async () => {
    const name = document.getElementById('person-name').value.trim();
    if (!name) { showToast('Error', 'Worker name is required', 'error'); return; }
    const entryData = {
      personName: name,
      action: 'enter'
    };
    try {
      await createEntry('person', entryData);
      document.getElementById('person-name').value = '';
      document.getElementById('person-form-panel').classList.remove('active');
      showToast('Success', `Worker "${name}" added`, 'success');
      sendWhatsAppNotify('person', entryData);
      loadAllSections();
    } catch (err) {
      showToast('Error', err.message, 'error');
    }
  });

  // Clipping submit
  document.getElementById('clipping-submit')?.addEventListener('click', async () => {
    const clipperName = document.getElementById('clipping-name').value.trim();
    const size = document.getElementById('clipping-size').value.trim();
    if (!clipperName || !size) { showToast('Error', 'Clipper name and size are required', 'error'); return; }
    const entryData = {
      type: window.clippingType || 'in',
      clipperName,
      size
    };
    try {
      await createEntry('clipping', entryData);
      document.getElementById('clipping-name').value = '';
      document.getElementById('clipping-size').value = '';
      document.getElementById('clipping-form-panel').classList.remove('active');
      showToast('Success', 'Clipping entry added', 'success');
      sendWhatsAppNotify('clipping', entryData);
      loadAllSections();
    } catch (err) {
      showToast('Error', err.message, 'error');
    }
  });
}

// Initialize admin page
showPasswordGate(() => {
  loadAllSections();
  setupForms();
  setupLogout();
  initWhatsAppStatus();
});

/* ========== WhatsApp Integration (Pairing Code) ========== */

function waHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + getToken()
  };
}

const WA_ALL_SECTIONS = [
  'wa-status-section','wa-pair-section','wa-code-section',
  'wa-loading-section','wa-linked-section','wa-error-section'
];

function showWaSection(...ids) {
  WA_ALL_SECTIONS.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = ids.includes(id) ? '' : 'none';
  });
}

async function initWhatsAppStatus() {
  try {
    const res = await fetch('/api/whatsapp?action=status', { headers: waHeaders() });
    const data = await res.json();
    updateWaButton(data.linked);
  } catch { /* silent */ }
}

function updateWaButton(linked) {
  const btn = document.getElementById('whatsapp-btn');
  const txt = document.getElementById('wa-status-text');
  if (!btn) return;
  if (linked) {
    btn.classList.remove('btn-success');
    btn.classList.add('btn-wa-linked');
    if (txt) txt.textContent = 'WA Linked';
  } else {
    btn.classList.remove('btn-wa-linked');
    btn.classList.add('btn-success');
    if (txt) txt.textContent = 'WhatsApp';
  }
}

window.openWhatsAppModal = async function() {
  const modal = document.getElementById('wa-modal');
  if (modal) modal.style.display = 'flex';

  // Reset UI
  showWaSection('wa-status-section');
  document.getElementById('wa-link-btn').style.display = 'none';
  document.getElementById('wa-unlink-btn').style.display = 'none';
  document.getElementById('wa-status-label').textContent = 'Checking...';
  document.getElementById('wa-status-dot').className = 'wa-status-dot wa-dot-checking';
  document.getElementById('wa-phone-info').style.display = 'none';
  document.getElementById('wa-session-info').style.display = 'none';
  document.getElementById('wa-error-section').style.display = 'none';

  await checkWhatsAppStatus();
};

window.closeWhatsAppModal = function() {
  const modal = document.getElementById('wa-modal');
  if (modal) modal.style.display = 'none';
};

async function checkWhatsAppStatus() {
  try {
    const res = await fetch('/api/whatsapp?action=status', { headers: waHeaders() });
    const data = await res.json();

    if (data.linked) {
      document.getElementById('wa-status-label').textContent = 'Connected';
      document.getElementById('wa-status-dot').className = 'wa-status-dot wa-dot-linked';
      document.getElementById('wa-phone-info').style.display = 'flex';
      document.getElementById('wa-phone-number').textContent = '+' + (data.phone || 'Unknown');
      document.getElementById('wa-link-btn').style.display = 'none';
      document.getElementById('wa-unlink-btn').style.display = 'inline-flex';

      // Show session ID if available
      if (data.sessionId) {
        document.getElementById('wa-session-info').style.display = 'flex';
        document.getElementById('wa-session-id').textContent = data.sessionId;
      }

      showWaSection('wa-status-section', 'wa-linked-section');

      // Show session ID in linked section too
      if (data.sessionId) {
        document.getElementById('wa-linked-session').style.display = 'block';
        document.getElementById('wa-session-box').textContent = data.sessionId;
      }

      updateWaButton(true);
    } else {
      document.getElementById('wa-status-label').textContent = 'Not Connected';
      document.getElementById('wa-status-dot').className = 'wa-status-dot wa-dot-unlinked';
      document.getElementById('wa-phone-info').style.display = 'none';
      document.getElementById('wa-session-info').style.display = 'none';
      document.getElementById('wa-link-btn').style.display = 'inline-flex';
      document.getElementById('wa-unlink-btn').style.display = 'none';
      showWaSection('wa-status-section');
      updateWaButton(false);
    }
  } catch (err) {
    document.getElementById('wa-status-label').textContent = 'Error';
    document.getElementById('wa-status-dot').className = 'wa-status-dot wa-dot-unlinked';
    document.getElementById('wa-link-btn').style.display = 'inline-flex';
    showWaSection('wa-status-section');
  }
}

// "Link WhatsApp" button shows the phone input pair section
window.linkWhatsApp = function() {
  showWaSection('wa-pair-section');
  document.getElementById('wa-phone-input').value = '';
  document.getElementById('wa-phone-input').focus();
  document.getElementById('wa-error-section').style.display = 'none';
};

// Request pairing code from the API
window.requestPairingCode = async function() {
  const phone = document.getElementById('wa-phone-input').value.trim().replace(/\D/g, '');
  if (!phone || phone.length < 10) {
    showWaSection('wa-pair-section', 'wa-error-section');
    document.getElementById('wa-error-text').textContent = 'Please enter a valid phone number with country code (e.g. 923001234567)';
    return;
  }

  // Show loading
  showWaSection('wa-loading-section');
  document.getElementById('wa-loading-text').textContent = 'Requesting pairing code... Please wait.';
  document.getElementById('wa-error-section').style.display = 'none';

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 58000);

    const res = await fetch('/api/whatsapp?action=pair', {
      method: 'POST',
      headers: waHeaders(),
      body: JSON.stringify({ phone }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const errData = await res.json().catch(() => ({ error: 'Server error ' + res.status }));
      throw new Error(errData.error || errData.hint || 'API returned ' + res.status);
    }

    const data = await res.json();

    if (data.status === 'linked') {
      // Successfully paired!
      showWaSection('wa-status-section', 'wa-linked-section');
      document.getElementById('wa-status-label').textContent = 'Connected';
      document.getElementById('wa-status-dot').className = 'wa-status-dot wa-dot-linked';
      document.getElementById('wa-phone-info').style.display = 'flex';
      document.getElementById('wa-phone-number').textContent = '+' + (data.phone || phone);
      document.getElementById('wa-unlink-btn').style.display = 'inline-flex';

      // Show session ID prominently
      if (data.sessionId) {
        document.getElementById('wa-linked-session').style.display = 'block';
        document.getElementById('wa-session-box').textContent = data.sessionId;
        document.getElementById('wa-session-info').style.display = 'flex';
        document.getElementById('wa-session-id').textContent = data.sessionId;
      }

      updateWaButton(true);
      showToast('WhatsApp Linked!', 'Session ID: ' + (data.sessionId || 'N/A') + ' — Add as WA_SESSION_ID env var on Vercel', 'success');

    } else if (data.pairingCode && data.status !== 'timeout') {
      // Got pairing code but connection not yet established (shouldn't happen with current API, but handle it)
      showWaSection('wa-code-section');
      document.getElementById('wa-code-display').textContent = data.pairingCode;
      document.getElementById('wa-waiting-text').textContent = 'Waiting for code entry...';

      // If there's also a message about error/timeout
      if (data.status === 'error' || data.status === 'timeout') {
        showWaSection('wa-code-section', 'wa-error-section');
        document.getElementById('wa-error-text').textContent = data.message || 'Pairing timed out. Please try again.';
        document.getElementById('wa-link-btn').style.display = 'inline-flex';
      }

    } else if (data.status === 'error' || data.status === 'timeout') {
      showWaSection('wa-status-section', 'wa-error-section');
      document.getElementById('wa-error-text').textContent = data.message || 'Pairing failed. Please try again.';
      document.getElementById('wa-link-btn').style.display = 'inline-flex';

    } else {
      showWaSection('wa-status-section', 'wa-error-section');
      document.getElementById('wa-error-text').textContent = 'Unexpected response. Please try again.';
      document.getElementById('wa-link-btn').style.display = 'inline-flex';
    }

  } catch (err) {
    showWaSection('wa-status-section', 'wa-error-section');
    const msg = err.name === 'AbortError'
      ? 'Request timed out (58s). Please try again.'
      : 'Error: ' + err.message;
    document.getElementById('wa-error-text').textContent = msg;
    document.getElementById('wa-link-btn').style.display = 'inline-flex';
  }
};

// Copy session ID to clipboard
window.copySessionId = function() {
  const box = document.getElementById('wa-session-box');
  if (box && box.textContent) {
    navigator.clipboard.writeText(box.textContent).then(() => {
      showToast('Copied!', 'Session ID copied to clipboard', 'success');
    }).catch(() => {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = box.textContent;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast('Copied!', 'Session ID copied to clipboard', 'success');
    });
  }
};

window.unlinkWhatsApp = async function() {
  if (!confirm('Are you sure you want to unlink WhatsApp? Notifications will stop.')) return;

  document.getElementById('wa-unlink-btn').disabled = true;
  document.getElementById('wa-unlink-btn').innerHTML = '<span class="loading-spinner"></span> Unlinking...';

  try {
    const res = await fetch('/api/whatsapp?action=unlink', {
      method: 'DELETE',
      headers: waHeaders()
    });
    const data = await res.json();

    if (data.success) {
      showToast('WhatsApp', 'WhatsApp unlinked successfully.', 'success');
      await checkWhatsAppStatus();
    } else {
      showToast('Error', data.error || 'Failed to unlink', 'error');
    }
  } catch (err) {
    showToast('Error', 'Connection error: ' + err.message, 'error');
  } finally {
    document.getElementById('wa-unlink-btn').disabled = false;
    document.getElementById('wa-unlink-btn').innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg> Unlink WhatsApp';
  }
};

// Close modal on overlay click
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('wa-modal-overlay')) {
    closeWhatsAppModal();
  }
});
