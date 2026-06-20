// Section page entry point - section.html
import { fetchSection } from '../shared/api.js';
import { formatCurrency, calculateHours, getAbsents, sendViaBot } from '../shared/utils.js';
import { showToast } from '../shared/notifications.js';
import { renderItems } from '../sections/items.js';
import { renderWallet } from '../sections/wallet.js';
import { renderPerson } from '../sections/person.js';
import { renderMaintenance } from '../sections/maintenance.js';
import { renderSamples } from '../sections/samples.js';
import { renderClipping } from '../sections/clipping.js';
import { initDownloadButtons } from '../shared/download.js';
import { initTheme } from '../shared/theme.js';

// Initialize theme
initTheme();

// Section metadata
const SECTION_META = {
  items: {
    title: 'Items Management',
    subtitle: 'Inventory tracking & management',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',
    badgeClass: 'badge-primary',
    color: 'var(--accent)'
  },
  wallet: {
    title: 'Wallet',
    subtitle: 'Money in/out & balance tracking',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>',
    badgeClass: 'badge-success',
    color: 'var(--success)'
  },
  person: {
    title: 'Person Details',
    subtitle: 'Attendance & hours tracking',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    badgeClass: 'badge-primary',
    color: 'var(--info)'
  },
  maintenance: {
    title: 'Maintenance',
    subtitle: 'Complaints, issues & services',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',
    badgeClass: 'badge-warning',
    color: 'var(--warning)'
  },
  samples: {
    title: 'Sample Management',
    subtitle: 'Sample in/out management',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6v7l5 8H4l5-8V3z"/><line x1="8" y1="3" x2="16" y2="3"/></svg>',
    badgeClass: 'badge-primary',
    color: 'var(--accent)'
  },
  clipping: {
    title: 'Clipping Details',
    subtitle: 'Clipping details & tracking',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>',
    badgeClass: 'badge-primary',
    color: 'var(--accent)'
  }
};

// Get page from URL
const params = new URLSearchParams(window.location.search);
const page = params.get('page') || 'items';
const meta = SECTION_META[page];

// Validate page
if (!meta) {
  window.location.href = '/index.html';
}

// Update page metadata
document.title = `${meta.title} - UNIT STOCK MANAGEMENT`;
document.getElementById('section-title').textContent = meta.title;
document.getElementById('section-subtitle').textContent = meta.subtitle;
document.getElementById('section-icon').innerHTML = meta.icon;

let sectionData = [];

async function loadSection() {
  try {
    const data = await fetchSection(page);

    // Toast on change
    if (sectionData.length > 0 && JSON.stringify(data) !== JSON.stringify(sectionData)) {
      showToast('Updated', `${meta.title} data has been updated`, 'success');
    }
    sectionData = data;

    // Expose for download
    if (!window.__sectionData) window.__sectionData = {};
    window.__sectionData[page] = data;
    // Remap for download module (uses section name as key)
    window.__sectionData['current'] = data;

    const container = document.getElementById('section-body');
    if (!container) return;

    const opts = { isAdmin: false, onRefresh: loadSection };

    switch (page) {
      case 'items':
        renderItems(container, data, opts);
        updateBadge(`${data.length} items`);
        break;
      case 'wallet':
        renderWallet(container, data, opts);
        const balance = data.reduce((acc, e) => acc + (e.type === 'in' ? Number(e.amount) : -Number(e.amount)), 0);
        updateBadge(formatCurrency(balance));
        break;
      case 'person':
        renderPerson(container, data, opts);
        updateBadge(`${new Set(data.map(e => e.personName)).size} workers`);
        break;
      case 'maintenance':
        renderMaintenance(container, data, opts);
        const open = data.filter(e => e.status !== 'solved').length;
        updateBadge(`${open} open`);
        break;
      case 'samples':
        renderSamples(container, data, opts);
        updateBadge(`${data.length} entries`);
        break;
      case 'clipping':
        renderClipping(container, data, opts);
        updateBadge(`${data.length} entries`);
        break;
    }
  } catch (err) {
    console.error(`Error loading ${page}:`, err);
    const container = document.getElementById('section-body');
    if (container) {
      container.innerHTML = `<div class="empty-state"><p style="color:var(--danger);">Failed to load ${meta.title}</p></div>`;
    }
  }
}

function updateBadge(text) {
  const badge = document.getElementById('section-count');
  if (badge) badge.textContent = text;
}

// Search
function setupSearch() {
  const input = document.getElementById('section-search');
  if (!input) return;

  input.placeholder = `Search ${meta.title.toLowerCase()}...`;

  input.addEventListener('input', () => {
    const query = input.value.trim().toLowerCase();
    const container = document.getElementById('section-body');
    if (!container) return;

    if (!query) {
      renderFiltered(sectionData);
      return;
    }

    const filtered = sectionData.filter(entry => {
      const fields = [];
      switch (page) {
        case 'items': fields.push(entry.name, entry.number, entry.model, entry.person, entry.status); break;
        case 'wallet': fields.push(entry.personOrPurpose, entry.type, String(entry.amount)); break;
        case 'person': fields.push(entry.personName, entry.action); break;
        case 'maintenance': fields.push(entry.subject, entry.description, entry.category, entry.status); break;
        case 'samples': fields.push(entry.personName, entry.program, entry.pieces, entry.type); break;
        case 'clipping': fields.push(entry.clipperName, entry.size, entry.type); break;
      }
      return fields.some(f => f && String(f).toLowerCase().includes(query));
    });

    renderFiltered(filtered);
  });
}

function renderFiltered(data) {
  const container = document.getElementById('section-body');
  if (!container) return;
  const opts = { isAdmin: false, onRefresh: loadSection };
  switch (page) {
    case 'items': renderItems(container, data, opts); break;
    case 'wallet': renderWallet(container, data, opts); break;
    case 'person': renderPerson(container, data, opts); break;
    case 'maintenance': renderMaintenance(container, data, opts); break;
    case 'samples': renderSamples(container, data, opts); break;
    case 'clipping': renderClipping(container, data, opts); break;
  }
}

// Update header title
const headerTitle = document.getElementById('section-header-title');
if (headerTitle) {
  headerTitle.innerHTML = `${meta.icon}<span style="margin-left:8px;">${meta.title}</span>`;
  headerTitle.querySelector('svg').style.width = '20px';
  headerTitle.querySelector('svg').style.height = '20px';
  headerTitle.querySelector('svg').style.color = meta.color;
}

// Set download dropdown section mapping
const downloadDropdown = document.getElementById('section-download');
if (downloadDropdown) {
  downloadDropdown.setAttribute('data-section', page);
}

// Format timestamp for WhatsApp
function fmtTs(ts) {
  if (!ts) return 'N/A';
  const d = new Date(ts);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  let h = d.getHours(); const m = String(d.getMinutes()).padStart(2,'0');
  const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12;
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} ${h}:${m} ${ap}`;
}

// Build all entries with full details for WhatsApp
function buildAllEntries(section, data) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', hour12:true });
  const sep = '══════════════════════════════';
  const div = '──────────────────────────────';

  let title = '';
  let summary = '';
  let entries = '';

  switch (section) {
    case 'items': {
      const totalQty = data.reduce((a, e) => a + (Number(e.quantity) || 1), 0);
      const avail = data.filter(e => e.status === 'available').length;
      const inUse = data.filter(e => e.status === 'in-use').length;
      title = `📦 ✦ *ALL ITEMS (${data.length})* ✦ 📦`;
      summary = `📦 *Items:* ${data.length} | 🔢 *Qty:* ${totalQty} | ✅ *Avail:* ${avail} | 📤 *In Use:* ${inUse}`;
      entries = data.map((e, i) => [
        `${i+1}. 📋 *${e.name || 'N/A'}*`,
        `  🔢 Serial: ${e.number || 'N/A'}`,
        `  👤 Person: ${e.person || 'N/A'}`,
        `  📐 Model: ${e.model || 'N/A'}`,
        `  🔢 Qty: ${e.quantity || 1}`,
        `  📊 Status: ${e.status || 'available'}`,
        `  🕐 ${fmtTs(e.timestamp)}`
      ].join('\n')).join(`\n${div}\n`);
      break;
    }
    case 'wallet': {
      const totalIn = data.filter(e => e.type === 'in').reduce((a, e) => a + Number(e.amount), 0);
      const totalOut = data.filter(e => e.type === 'out').reduce((a, e) => a + Number(e.amount), 0);
      const bal = totalIn - totalOut;
      const bs = bal >= 0 ? '+' : '-';
      const bl = bal >= 0 ? '✅' : '⚠️';
      title = `💰 ✦ *ALL WALLET ENTRIES (${data.length})* ✦ 💰`;
      summary = `📥 *Received:* Rs. ${totalIn.toLocaleString()} | 📤 *Spent:* Rs. ${totalOut.toLocaleString()} | 🏦 *Balance:* ${bs}Rs. ${Math.abs(bal).toLocaleString()} ${bl}`;
      entries = data.map((e, i) => [
        `${i+1}. ${e.type === 'in' ? '📥' : '📤'} *${e.type === 'in' ? 'RECEIVED' : 'SPENT'}*`,
        `  👤 ${e.type === 'in' ? 'From' : 'For'}: ${e.personOrPurpose || 'N/A'}`,
        `  💵 Amount: Rs. ${Number(e.amount).toLocaleString()}`,
        `  🕐 ${fmtTs(e.timestamp)}`
      ].join('\n')).join(`\n${div}\n`);
      break;
    }
    case 'person': {
      const month = now.getMonth(), year = now.getFullYear();
      const monthName = now.toLocaleString('default', { month: 'long' });
      const workers = [...new Set(data.map(e => e.personName).filter(Boolean))].sort();
      let thAll = 0, tdAll = 0, taAll = 0;
      workers.forEach(n => {
        const h = calculateHours(data, n, month, year);
        const a = getAbsents(data, n, month, year);
        thAll += h.totalHours; tdAll += h.daysWorked; taAll += a;
      });
      title = `👷 ✦ *ALL PERSON ENTRIES (${data.length})* ✦ 👷`;
      summary = `📅 *${monthName} ${year}* | 👥 *Workers:* ${workers.length} | ⏱️ *Hours:* ${Math.round(thAll*10)/10}h | 📆 *Days:* ${tdAll} | ❌ *Absents:* ${taAll}`;
      // Group entries by worker
      entries = workers.map(name => {
        const wEntries = data.filter(e => e.personName === name).sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp));
        const hours = calculateHours(data, name, month, year);
        const absents = getAbsents(data, name, month, year);
        const entryLines = wEntries.map(e => `  ${e.action === 'enter' ? '📥' : '📤'} ${e.action === 'enter' ? 'Entry' : 'Exit'}: ${fmtTs(e.timestamp)}`).join('\n');
        return [
          `👤 *${name}* — ⏱️ ${hours.totalHours}h | 📆 ${hours.daysWorked}d | ❌ ${absents} absents`,
          entryLines
        ].join('\n');
      }).join(`\n${div}\n`);
      break;
    }
    case 'maintenance': {
      const open = data.filter(e => e.status !== 'solved').length;
      const solved = data.length - open;
      title = `🔧 ✦ *ALL MAINTENANCE (${data.length})* ✦ 🔧`;
      summary = `📊 *Total:* ${data.length} | 🔴 *Open:* ${open} | ✅ *Solved:* ${solved}`;
      entries = data.map((e, i) => [
        `${i+1}. ${e.status === 'solved' ? '✅' : '🔴'} *${e.subject || 'N/A'}*`,
        `  🔧 Type: ${e.category || 'N/A'}`,
        `  📄 Desc: ${e.description || 'N/A'}`,
        `  📊 Status: ${e.status || 'open'}`,
        `  🕐 ${fmtTs(e.timestamp)}`
      ].join('\n')).join(`\n${div}\n`);
      break;
    }
    case 'samples': {
      const tIn = data.filter(e => e.type === 'in').length;
      const tOut = data.filter(e => e.type === 'out').length;
      const tp = data.reduce((a, e) => a + (Number(e.pieces) || 0), 0);
      title = `🧪 ✦ *ALL SAMPLES (${data.length})* ✦ 🧪`;
      summary = `📊 *Entries:* ${data.length} | 📥 *In:* ${tIn} | 📤 *Out:* ${tOut} | 🔢 *Pieces:* ${tp}`;
      entries = data.map((e, i) => [
        `${i+1}. ${e.type === 'in' ? '📥' : '📤'} *SAMPLE ${e.type === 'in' ? 'RECEIVED' : 'SENT'}*`,
        `  👤 Person: ${e.personName || 'N/A'}`,
        `  📋 Program: ${e.program || 'N/A'}`,
        `  🔢 Pieces: ${e.pieces || 'N/A'}`,
        `  🕐 ${fmtTs(e.timestamp)}`
      ].join('\n')).join(`\n${div}\n`);
      break;
    }
    case 'clipping': {
      const inE = data.filter(e => e.type === 'in');
      const outE = data.filter(e => e.type === 'out');
      const trE = data.filter(e => e.type === 'transfer');
      let tSize = 0; inE.forEach(e => { const n = parseFloat(e.size); if (!isNaN(n)) tSize += n; });
      let tTrans = 0; trE.forEach(e => { const n = parseFloat(e.size); if (!isNaN(n)) tTrans += n; });
      const tRs = tSize * 12, rem = tRs - tTrans;
      title = `✂️ ✦ *ALL CLIPPING (${data.length})* ✦ ✂️`;
      summary = `✂️ *Total:* ${inE.length + outE.length} | 📥 *In:* ${inE.length} (${tSize}yd) | 📤 *Out:* ${outE.length} | 💰 *Pay:* Rs. ${tRs.toLocaleString()} | 💸 *Paid:* Rs. ${tTrans.toLocaleString()} | 🏦 *Rem:* Rs. ${rem.toLocaleString()}`;
      entries = data.map((e, i) => {
        const icon = e.type === 'in' ? '📥' : e.type === 'out' ? '📤' : '💸';
        const label = e.type === 'in' ? 'CLIPPED IN' : e.type === 'out' ? 'OUT FOR CLIPPING' : 'TRANSFER';
        return [
          `${i+1}. ${icon} *${label}*`,
          `  ✂️ ${e.type === 'transfer' ? 'Recipient' : 'Clipper'}: ${e.clipperName || 'N/A'}`,
          `  ${e.type === 'transfer' ? '💵' : '📏'} ${e.type === 'transfer' ? 'Amount' : 'Size'}: ${e.size || 'N/A'}`,
          `  🕐 ${fmtTs(e.timestamp)}`
        ].join('\n');
      }).join(`\n${div}\n`);
      break;
    }
    default:
      return null;
  }

  const pageUrl = `https://zaidbwp.vercel.app/section.html?page=${section}`;
  return `${title}\n${sep}\n${summary}\n${sep}\n${entries}\n${sep}\n🏢 *UNIT STOCK MANAGEMENT*\n📅 ${dateStr}  ⏰ ${timeStr}\n${sep}\n🌐 *View Details:*\n${pageUrl}`;
}

// Setup WhatsApp send button
function setupWaSendButton() {
  const btn = document.getElementById('wa-send-btn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const msg = buildAllEntries(page, sectionData);
    if (!msg) return;
    sendViaBot(msg);
  });
}

// Init
setupSearch();
setupWaSendButton();
initDownloadButtons();

// Load with progress
const lp = window.__lp || function(){};
lp(20, 'Loading ' + meta.title + '...');
loadSection().then(() => {
  lp(100, meta.title + ' ready!');
}).catch(() => {
  lp(100, 'Loaded with errors');
});

// Poll every 30 seconds
setInterval(loadSection, 30000);

// Register SW
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}
