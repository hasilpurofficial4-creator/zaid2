// Admin page entry point - admin.html
import { fetchSection, createEntry } from '../shared/api.js';
import { showToast } from '../shared/notifications.js';
import { showPasswordGate, setupLogout } from '../shared/auth.js';
import { renderItems } from '../sections/items.js';
import { renderWallet } from '../sections/wallet.js';
import { renderPerson } from '../sections/person.js';
import { renderMaintenance } from '../sections/maintenance.js';
import { renderSamples } from '../sections/samples.js';
import { renderClipping } from '../sections/clipping.js';
import { renderBills } from '../sections/bills.js';
import { initTheme } from '../shared/theme.js';
import { sendViaBot } from '../shared/utils.js';

const BOT_NAME = 'UNIT STOCK MANAGEMENT';

// Initialize theme toggle
initTheme();

const SECTIONS = ['items', 'wallet', 'person', 'maintenance', 'samples', 'clipping', 'bills'];

// ==================== WhatsApp Direct Notify ====================
const LINE = '╔══════════════════════════════╗';
const DIV  = '╠══════════════════════════════╣';
const END  = '╚══════════════════════════════╝';

function buildWhatsAppMessage(section, entry) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', hour12:true });

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
      break;
    case 'person':
      title = '👷 ✦ *WORKER ADDED* ✦ 👷';
      body = `👤 *Name:* ${entry.personName}\n✅ *Action:* Entry Logged`;
      break;
    case 'maintenance':
      if (entry.status === 'solved') {
        title = '✅ ✦ *ISSUE RESOLVED* ✦ ✅';
        body = `🔧 *Type:* ${entry.category}\n📝 *Subject:* ${entry.subject}\n✅ *Status:* Resolved`;
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
      title = '✂️ ✦ *CLIPPING ENTRY* ✂️';
      body = `✂️ *Clipper:* ${entry.clipperName}\n📏 *Size:* ${entry.size}\n📥 *Type:* ${entry.type === 'in' ? '✅ Clipped In' : '📤 Out for Clipping'}`;
      break;
    case 'bills': {
      title = '🧾 ✦ *NEW BILL* ✦ 🧾';
      const itemCount = Array.isArray(entry.items) ? entry.items.length : 0;
      body = `👤 *Person:* ${entry.personName}\n📋 *Purpose:* ${entry.billPurpose}\n📦 *Items:* ${itemCount}\n💰 *Total:* Rs. ${Number(entry.totalAmount || 0).toLocaleString()}\n📅 *Date:* ${entry.date} ${entry.time}`;
      break;
    }
    default:
      title = `🔔 ✦ *NEW: ${section.toUpperCase()}* ✦ 🔔`;
      body = `➤ ${JSON.stringify(entry)}`;
  }

  const pageUrl = `https://zaidbwp.vercel.app/section.html?page=${section}`;
  return `${title}\n${LINE}\n${body}\n${DIV}\n🏢 *${BOT_NAME}*\n📅 ${dateStr}  ⏰ ${timeStr}\n${DIV}\n🌐 *View Details:*\n${pageUrl}\n🔗 https://zaidbwp.vercel.app\n📱 Admin: +923299931199\n${END}`;
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
      case 'bills': renderBills(container, data, opts); break;
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
      loadAllSections();
    } catch (err) {
      showToast('Error', err.message, 'error');
    }
  });

  // Bills submit
  document.getElementById('bills-submit')?.addEventListener('click', async () => {
    const personName = document.getElementById('bills-person').value.trim();
    const billPurpose = document.getElementById('bills-purpose').value.trim();
    if (!personName || !billPurpose) { showToast('Error', 'Person name and bill purpose are required', 'error'); return; }
    // Gather item rows
    const rows = document.querySelectorAll('#bills-items-container .bill-item-row');
    if (!rows.length) { showToast('Error', 'Add at least one item', 'error'); return; }
    const items = [];
    rows.forEach(row => {
      const name = row.querySelector('.bill-item-name')?.value.trim() || '';
      const quantity = Number(row.querySelector('.bill-item-qty')?.value) || 1;
      const model = row.querySelector('.bill-item-model')?.value.trim() || '';
      const price = Number(row.querySelector('.bill-item-price')?.value) || 0;
      if (name) items.push({ name, quantity, model, price });
    });
    if (!items.length) { showToast('Error', 'Add at least one item with a name', 'error'); return; }
    const date = document.getElementById('bills-date').value || new Date().toISOString().slice(0, 10);
    const time = document.getElementById('bills-time').value || new Date().toTimeString().slice(0, 5);
    const entryData = { personName, billPurpose, items, date, time };
    try {
      await createEntry('bills', entryData);
      document.getElementById('bills-person').value = '';
      document.getElementById('bills-purpose').value = '';
      document.getElementById('bills-items-container').innerHTML = '';
      document.getElementById('bills-total-display').textContent = 'Rs. 0';
      document.getElementById('bills-form-panel').classList.remove('active');
      showToast('Success', 'Bill submitted successfully', 'success');
      loadAllSections();
    } catch (err) {
      showToast('Error', err.message, 'error');
    }
  });
}

// Initialize admin page
const lp = window.__lp || function(){};
// Hide loading screen while waiting for password auth
const loadingEl = document.getElementById('loading-screen');
if (loadingEl) loadingEl.style.display = 'none';

showPasswordGate(async () => {
  // Show loading screen again after auth
  if (loadingEl) loadingEl.style.display = '';
  lp(25, 'Loading sections...');
  await loadAllSections();
  lp(80, 'Setting up forms...');
  setupForms();
  setupLogout();
  initWhatsAppStatus();
  lp(100, 'Admin panel ready!');
});

/* ========== WhatsApp Bot Status (Railway) ========== */

async function initWhatsAppStatus() {
  try {
    const res = await fetch('/api/wa-status');
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
    if (txt) txt.textContent = 'WA Connected';
  } else {
    btn.classList.remove('btn-wa-linked');
    btn.classList.add('btn-success');
    if (txt) txt.textContent = 'WA Offline';
  }
}

window.openWhatsAppModal = async function() {
  const modal = document.getElementById('wa-modal');
  if (modal) modal.style.display = 'flex';
  await checkBotStatus();
};

window.closeWhatsAppModal = function() {
  const modal = document.getElementById('wa-modal');
  if (modal) modal.style.display = 'none';
};

async function checkBotStatus() {
  const statusEl = document.getElementById('wa-status-label');
  const dotEl = document.getElementById('wa-status-dot');
  const detailsEl = document.getElementById('wa-bot-details');
  const testBtn = document.getElementById('wa-test-send-btn');

  if (statusEl) statusEl.textContent = 'Checking...';
  if (dotEl) dotEl.className = 'wa-status-dot wa-dot-checking';
  if (detailsEl) detailsEl.style.display = 'none';

  try {
    const res = await fetch('/api/wa-status');
    const data = await res.json();

    if (data.error) {
      if (statusEl) statusEl.textContent = 'Error';
      if (dotEl) dotEl.className = 'wa-status-dot wa-dot-unlinked';
      showBotDetails(data);
      return;
    }

    if (data.linked) {
      if (statusEl) statusEl.textContent = 'Connected';
      if (dotEl) dotEl.className = 'wa-status-dot wa-dot-linked';
      updateWaButton(true);
    } else if (data.online) {
      if (statusEl) statusEl.textContent = 'Online (not paired)';
      if (dotEl) dotEl.className = 'wa-status-dot wa-dot-checking';
    } else {
      if (statusEl) statusEl.textContent = 'Offline';
      if (dotEl) dotEl.className = 'wa-status-dot wa-dot-unlinked';
    }

    showBotDetails(data);
  } catch (err) {
    if (statusEl) statusEl.textContent = 'Error';
    if (dotEl) dotEl.className = 'wa-status-dot wa-dot-unlinked';
  }
}

function showBotDetails(data) {
  const detailsEl = document.getElementById('wa-bot-details');
  if (!detailsEl) return;
  detailsEl.style.display = 'block';

  const fields = [
    { label: 'Bot Running', value: data.botRunning ? '✅ Yes' : '❌ No' },
    { label: 'WhatsApp', value: data.linked ? '✅ Connected' : '❌ Not paired' },
    { label: 'Pending Messages', value: data.pendingMessages ?? 'N/A' },
    { label: 'Sent Messages', value: data.sentMessages ?? 'N/A' },
    { label: 'Admin Number', value: data.adminNumber || 'N/A' },
    { label: 'Uptime', value: data.uptime || 'N/A' },
    { label: 'Service URL', value: data.serviceUrl || 'Not set' }
  ];

  let html = '<div class="wa-bot-info">';
  fields.forEach(f => {
    html += `<div class="wa-bot-row"><span class="wa-bot-label">${f.label}:</span><span class="wa-bot-value">${f.value}</span></div>`;
  });

  if (data.error) {
    html += `<div class="wa-bot-error">⚠️ ${data.error}</div>`;
  }
  if (data.hint) {
    html += `<div class="wa-bot-hint">💡 ${data.hint}</div>`;
  }

  if (data.recentLogs && data.recentLogs.length > 0) {
    html += '<div class="wa-bot-logs"><span class="wa-bot-label">Recent Logs:</span><pre class="wa-log-box">';
    data.recentLogs.slice(-5).forEach(l => { html += l + '\n'; });
    html += '</pre></div>';
  }

  html += '</div>';
  detailsEl.innerHTML = html;
}

// Test send button
window.testWaSend = async function() {
  const btn = document.getElementById('wa-test-send-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Sending...'; }

  try {
    const testMsg = `🧪 *TEST MESSAGE*\n${LINE}\n✅ WhatsApp bot is working!\n🏢 *${BOT_NAME}*\n📅 ${new Date().toLocaleString()}\n${END}`;
    const res = await fetch('/api/whatsapp-send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: testMsg })
    });
    const data = await res.json();
    if (data.success) {
      showToast('WhatsApp', '✅ Test message queued successfully!', 'success');
    } else {
      showToast('WhatsApp', '❌ Failed: ' + (data.error || 'Unknown error'), 'error');
    }
  } catch (err) {
    showToast('WhatsApp', '❌ Error: ' + err.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Send Test Message'; }
  }
};

// Refresh status button
window.refreshWaStatus = function() {
  checkBotStatus();
};

// Close modal on overlay click
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('wa-modal-overlay')) {
    closeWhatsAppModal();
  }
});
