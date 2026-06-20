// Home hub page entry point - index.html
import { fetchSection } from '../shared/api.js';
import { formatCurrency, calculateHours, getAbsents, sendViaBot } from '../shared/utils.js';
import { initNotifications, setupInstallPrompt } from '../shared/notifications.js';
import { initTheme } from '../shared/theme.js';

// Initialize theme toggle
initTheme();

const WA_TARGET = '923244643714';
const sectionData = {}; // Cache for fetched data

// Build a section-specific summary message for WhatsApp
function buildSectionSummary(section) {
  const data = sectionData[section];
  if (!data) return null;

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', hour12:true });
  const line = '══════════════════════════════';
  let title = '', body = '';

  switch (section) {
    case 'items': {
      const total = data.length;
      const totalQty = data.reduce((a, e) => a + (Number(e.quantity) || 1), 0);
      const inUse = data.filter(e => e.status === 'in-use').length;
      const available = data.filter(e => e.status === 'available').length;
      const maintenance = data.filter(e => e.status === 'maintenance').length;
      const persons = [...new Set(data.map(e => e.person).filter(Boolean))];
      title = '📦 ✦ *ITEMS SUMMARY* ✦ 📦';
      body = `📦 *Total Items:* ${total}\n🔢 *Total Quantity:* ${totalQty}\n✅ *Available:* ${available}\n📤 *In Use:* ${inUse}\n🔧 *Maintenance:* ${maintenance}`;
      if (persons.length > 0) body += `\n👥 *Assigned To:* ${persons.length} persons`;
      break;
    }
    case 'wallet': {
      const totalIn = data.filter(e => e.type === 'in').reduce((a, e) => a + Number(e.amount), 0);
      const totalOut = data.filter(e => e.type === 'out').reduce((a, e) => a + Number(e.amount), 0);
      const balance = totalIn - totalOut;
      const balSign = balance >= 0 ? '+' : '-';
      const balLabel = balance >= 0 ? '✅ POSITIVE' : '⚠️ NEGATIVE';
      title = '💰 ✦ *WALLET SUMMARY* ✦ 💰';
      body = `📥 *Total Received:* Rs. ${totalIn.toLocaleString()}\n📤 *Total Spent:* Rs. ${totalOut.toLocaleString()}\n🏦 *Balance:* ${balSign}Rs. ${Math.abs(balance).toLocaleString()} (${balLabel})\n📊 *Entries:* ${data.length}`;
      break;
    }
    case 'person': {
      const month = now.getMonth();
      const year = now.getFullYear();
      const monthName = now.toLocaleString('default', { month: 'long' });
      const workers = [...new Set(data.map(e => e.personName).filter(Boolean))].sort();
      let totalHoursAll = 0, totalDaysAll = 0, totalAbsentsAll = 0;
      const workerLines = workers.map(name => {
        const hours = calculateHours(data, name, month, year);
        const absents = getAbsents(data, name, month, year);
        totalHoursAll += hours.totalHours;
        totalDaysAll += hours.daysWorked;
        totalAbsentsAll += absents;
        return `  👤 ${name}: ⏱️ ${hours.totalHours}h | 📅 ${hours.daysWorked}d present | ❌ ${absents} absents`;
      }).join('\n');
      title = '👷 ✦ *PERSON SUMMARY* ✦ 👷';
      body = `📅 *Month:* ${monthName} ${year}\n👥 *Workers:* ${workers.length}\n⏱️ *Total Hours:* ${Math.round(totalHoursAll * 10) / 10}h\n📆 *Total Days Worked:* ${totalDaysAll}\n❌ *Total Absents:* ${totalAbsentsAll}\n\n👷 *Per Worker:*\n${workerLines}`;
      break;
    }
    case 'maintenance': {
      const total = data.length;
      const open = data.filter(e => e.status !== 'solved').length;
      const solved = total - open;
      title = '🔧 ✦ *MAINTENANCE SUMMARY* ✦ 🔧';
      body = `📊 *Total Issues:* ${total}\n🔴 *Open:* ${open}\n✅ *Solved:* ${solved}`;
      break;
    }
    case 'samples': {
      const totalIn = data.filter(e => e.type === 'in').length;
      const totalOut = data.filter(e => e.type === 'out').length;
      const totalPieces = data.reduce((a, e) => a + (Number(e.pieces) || 0), 0);
      title = '🧪 ✦ *SAMPLES SUMMARY* ✦ 🧪';
      body = `📊 *Total Entries:* ${data.length}\n📥 *Received (In):* ${totalIn}\n📤 *Sent (Out):* ${totalOut}\n🔢 *Total Pieces:* ${totalPieces}`;
      break;
    }
    case 'clipping': {
      const inEntries = data.filter(e => e.type === 'in');
      const outEntries = data.filter(e => e.type === 'out');
      const transferEntries = data.filter(e => e.type === 'transfer');
      let totalSize = 0;
      inEntries.forEach(e => { const n = parseFloat(e.size); if (!isNaN(n)) totalSize += n; });
      let totalTransferred = 0;
      transferEntries.forEach(e => { const n = parseFloat(e.size); if (!isNaN(n)) totalTransferred += n; });
      const totalRupees = totalSize * 12;
      const remaining = totalRupees - totalTransferred;
      title = '✂️ ✦ *CLIPPING SUMMARY* ✦ ✂️';
      body = `✂️ *Total Clippings:* ${inEntries.length + outEntries.length}\n📥 *Clipped In:* ${inEntries.length} (${totalSize} yards)\n📤 *Out for Clipping:* ${outEntries.length}\n💰 *Total Payment:* Rs. ${totalRupees.toLocaleString()} (${totalSize} × 12)\n💸 *Paid/Transferred:* Rs. ${totalTransferred.toLocaleString()} (${transferEntries.length} transfers)\n🏦 *Remaining:* Rs. ${remaining.toLocaleString()}`;
      break;
    }
    default:
      return null;
  }

  const pageUrl = `https://zaidbwp.vercel.app/section.html?page=${section}`;
  return `${title}\n${line}\n${body}\n${line}\n🏢 *UNIT STOCK MANAGEMENT*\n📅 ${dateStr}  ⏰ ${timeStr}\n${line}\n🌐 *View Details:*\n${pageUrl}`;
}

// Send section summary via WhatsApp
function sendSectionSummary(section) {
  const msg = buildSectionSummary(section);
  if (!msg) return;
  sendViaBot(msg);
}

// Quick stats for the hub
async function loadHubStats() {
  try {
    const [items, wallet, person, maintenance] = await Promise.all([
      fetchSection('items'),
      fetchSection('wallet'),
      fetchSection('person'),
      fetchSection('maintenance')
    ]);

    // Cache data for summary builder
    sectionData.items = items;
    sectionData.wallet = wallet;
    sectionData.person = person;
    sectionData.maintenance = maintenance;

    // Items count
    const itemsEl = document.getElementById('stat-items');
    if (itemsEl) itemsEl.textContent = items.length;
    const badgeItems = document.getElementById('badge-items');
    if (badgeItems) badgeItems.textContent = items.length;

    // Wallet balance
    const balance = wallet.reduce((acc, e) => acc + (e.type === 'in' ? Number(e.amount) : -Number(e.amount)), 0);
    const walletEl = document.getElementById('stat-wallet');
    if (walletEl) {
      walletEl.textContent = formatCurrency(balance);
      walletEl.style.color = balance >= 0 ? 'var(--success)' : 'var(--danger)';
    }
    const badgeWallet = document.getElementById('badge-wallet');
    if (badgeWallet) badgeWallet.textContent = formatCurrency(balance);

    // Person - today's activity
    const today = new Date().toDateString();
    const todayCount = person.filter(e => new Date(e.timestamp).toDateString() === today).length;
    const activityEl = document.getElementById('stat-activity');
    if (activityEl) activityEl.textContent = todayCount;
    const badgePerson = document.getElementById('badge-person');
    if (badgePerson) badgePerson.textContent = todayCount + ' today';

    // Maintenance - open issues
    const openIssues = maintenance.filter(e => e.status !== 'solved').length;
    const issuesEl = document.getElementById('stat-issues');
    if (issuesEl) issuesEl.textContent = openIssues;
    const badgeMaint = document.getElementById('badge-maintenance');
    if (badgeMaint) badgeMaint.textContent = openIssues + ' open';

    // Samples & clipping badges
    const [samples, clipping] = await Promise.all([
      fetchSection('samples'),
      fetchSection('clipping')
    ]);

    // Cache for summary builder
    sectionData.samples = samples;
    sectionData.clipping = clipping;

    const badgeSamples = document.getElementById('badge-samples');
    if (badgeSamples) badgeSamples.textContent = samples.length;
    const badgeClipping = document.getElementById('badge-clipping');
    if (badgeClipping) badgeClipping.textContent = clipping.length;

  } catch (err) {
    console.error('Error loading hub stats:', err);
  }
}

// Animate cards on load
function animateCards() {
  const cards = document.querySelectorAll('.hub-card');
  cards.forEach((card, i) => {
    card.style.animationDelay = `${i * 0.08}s`;
    card.classList.add('hub-card-animate');
  });
}

// Wire up WhatsApp forward buttons
function setupForwardButtons() {
  document.querySelectorAll('.hub-wa-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const section = btn.dataset.section;
      if (section) sendSectionSummary(section);
    });
  });
}

// Init
loadHubStats();
animateCards();
setupForwardButtons();
initNotifications();
setupInstallPrompt();

// Poll stats every 30 seconds
setInterval(loadHubStats, 30000);

// Register SW
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}
