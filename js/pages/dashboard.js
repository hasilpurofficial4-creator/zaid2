// Home hub page entry point - index.html
import { fetchSection } from '../shared/api.js';
import { formatCurrency, calculateHours, getAbsents, sendViaBot } from '../shared/utils.js';
import { initNotifications, setupInstallPrompt } from '../shared/notifications.js';
import { initTheme } from '../shared/theme.js';

// Initialize theme toggle
initTheme();

const WA_TARGET = '923244643714';
const sectionData = {}; // Cache for fetched data
const lp = window.__lp || function(){};

lp(10, 'Fetching data...');

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
    case 'bills': {
      const totalAmt = data.reduce((a, e) => a + (Number(e.totalAmount) || 0), 0);
      const totalItems = data.reduce((a, e) => a + (Array.isArray(e.items) ? e.items.length : 0), 0);
      title = '🧾 ✦ *BILLS SUMMARY* ✦ 🧾';
      body = `📦 *Total Bills:* ${data.length}\n📋 *Total Items:* ${totalItems}\n💰 *Total Amount:* Rs. ${totalAmt.toLocaleString()}`;
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
    lp(15, 'Loading items & wallet...');
    const [items, wallet, person, maintenance] = await Promise.all([
      fetchSection('items'),
      fetchSection('wallet'),
      fetchSection('person'),
      fetchSection('maintenance')
    ]);

    lp(40, 'Loading attendance & issues...');

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

    lp(55, 'Loading samples & clipping...');

    // Samples & Clipping & Bills badges
    const [samples, clipping, bills] = await Promise.all([
      fetchSection('samples'),
      fetchSection('clipping'),
      fetchSection('bills')
    ]);
    
    // Cache for summary builder
    sectionData.samples = samples;
    sectionData.clipping = clipping;
    sectionData.bills = bills;
    
    const badgeSamples = document.getElementById('badge-samples');
    if (badgeSamples) badgeSamples.textContent = samples.length;
    const badgeClipping = document.getElementById('badge-clipping');
    if (badgeClipping) badgeClipping.textContent = clipping.length;
    const badgeBills = document.getElementById('badge-bills');
    if (badgeBills) {
      const billsTotal = bills.reduce((a, e) => a + (Number(e.totalAmount) || 0), 0);
      badgeBills.textContent = 'Rs. ' + billsTotal.toLocaleString();
    }

    lp(75, 'Building dashboard...');

    // Build salary calculator
    buildSalaryCalculator(person);

    lp(100, 'Dashboard ready!');

  } catch (err) {
    console.error('Error loading hub stats:', err);
    lp(100, 'Loaded with errors');
  }
}

// ==================== Salary Calculator ====================
const ZAID_SALARY = 42000;

function buildSalaryCalculator(personData) {
  const hubGrid = document.querySelector('.hub-grid');
  if (!hubGrid) return;

  // Remove existing calculator if any
  const existing = document.getElementById('salary-card');
  if (existing) existing.remove();

  const workers = [...new Set(personData.map(e => e.personName).filter(Boolean))].sort();
  // Add ZAID if not already present
  if (!workers.includes('ZAID')) workers.unshift('ZAID');
  if (!workers.length) return;

  const card = document.createElement('div');
  card.id = 'salary-card';
  card.style.cssText = 'grid-column:1/-1;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);padding:var(--space-lg);animation:fadeInUp 0.4s ease;';

  card.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
      <div style="width:36px;height:36px;border-radius:var(--radius-sm);background:rgba(245,158,11,0.1);display:flex;align-items:center;justify-content:center;font-size:18px;">💰</div>
      <div>
        <div style="font-size:0.95rem;font-weight:700;color:var(--text-primary);">Salary Calculator</div>
        <div style="font-size:0.7rem;color:var(--text-muted);">Calculate salary for previous full month</div>
      </div>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:end;">
      <div style="flex:1;min-width:120px;">
        <label style="font-size:0.7rem;font-weight:600;color:var(--text-muted);display:block;margin-bottom:4px;">Worker</label>
        <select id="salary-worker" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:var(--radius);font-family:var(--font);font-size:0.85rem;background:var(--bg-card);color:var(--text-primary);">
          ${workers.map(w => `<option value="${w}">${w}</option>`).join('')}
        </select>
      </div>
      <div style="flex:1;min-width:120px;" id="salary-amount-wrap">
        <label style="font-size:0.7rem;font-weight:600;color:var(--text-muted);display:block;margin-bottom:4px;">Monthly Salary (Rs.)</label>
        <input type="number" id="salary-amount" placeholder="25000" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:var(--radius);font-family:var(--font);font-size:0.85rem;background:var(--bg-card);color:var(--text-primary);">
      </div>
      <button id="salary-calc-btn" class="btn btn-primary" style="padding:10px 20px;white-space:nowrap;">Calculate</button>
    </div>
    <div id="salary-result" style="display:none;margin-top:14px;"></div>
  `;

  hubGrid.parentNode.insertBefore(card, hubGrid.nextSibling);

  // ZAID auto-fill: hide salary input when ZAID selected
  const workerSelect = document.getElementById('salary-worker');
  const amountWrap = document.getElementById('salary-amount-wrap');
  const amountInput = document.getElementById('salary-amount');
  function onWorkerChange() {
    if (workerSelect.value === 'ZAID') {
      amountInput.value = ZAID_SALARY;
      amountInput.disabled = true;
      amountInput.title = 'ZAID fixed salary: Rs. ' + ZAID_SALARY.toLocaleString();
    } else {
      amountInput.value = '';
      amountInput.disabled = false;
      amountInput.title = '';
    }
  }
  workerSelect.addEventListener('change', onWorkerChange);
  onWorkerChange(); // trigger on load

  document.getElementById('salary-calc-btn').addEventListener('click', () => {
    const workerName = document.getElementById('salary-worker').value;
    const monthlySalary = parseFloat(document.getElementById('salary-amount').value);
    if (!workerName || isNaN(monthlySalary) || monthlySalary <= 0) return;
    calculateWorkerSalary(workerName, monthlySalary, personData);
  });
}

function calculateWorkerSalary(workerName, monthlySalary, personData) {
  const result = document.getElementById('salary-result');
  if (!result) return;

  const isZaid = workerName === 'ZAID';
  const today = new Date();
  // Always use previous full month (1st to last day)
  const periodStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const periodEnd = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);
  const daysInMonth = new Date(today.getFullYear(), today.getMonth(), 0).getDate();
  const monthName = periodStart.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Count days worked (only from attendance data for workers other than ZAID)
  let daysWorked = 0;
  let absents = 0;
  if (!isZaid) {
    const enterEntries = personData
      .filter(e => e.personName === workerName && e.action === 'enter')
      .map(e => ({ ...e, _date: new Date(e.timestamp) }))
      .filter(e => e._date >= periodStart && e._date <= periodEnd);
    const workDates = new Set();
    enterEntries.forEach(e => workDates.add(e._date.toDateString()));
    daysWorked = workDates.size;
    absents = daysInMonth - daysWorked;
  } else {
    daysWorked = daysInMonth; // ZAID: 0 absents, full month
    absents = 0;
  }

  const dailyRate = monthlySalary / daysInMonth;
  const earnedSalary = Math.round(dailyRate * daysWorked);
  const periodStartStr = periodStart.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  const periodEndStr = periodEnd.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  result.style.display = 'block';
  result.innerHTML = `
    <div style="background:var(--bg-secondary);border-radius:var(--radius);padding:14px;border:1px solid var(--border);">
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;text-align:center;margin-bottom:12px;">
        <div>
          <div style="font-size:0.6rem;color:var(--text-muted);text-transform:uppercase;">Days Worked</div>
          <div style="font-size:1.3rem;font-weight:800;color:var(--accent);font-family:var(--font-mono);">${daysWorked}</div>
        </div>
        <div>
          <div style="font-size:0.6rem;color:var(--text-muted);text-transform:uppercase;">Absents</div>
          <div style="font-size:1.3rem;font-weight:800;color:var(--danger);font-family:var(--font-mono);">${absents}</div>
        </div>
        <div>
          <div style="font-size:0.6rem;color:var(--text-muted);text-transform:uppercase;">Daily Rate</div>
          <div style="font-size:1.3rem;font-weight:800;color:var(--info);font-family:var(--font-mono);">Rs. ${Math.round(dailyRate).toLocaleString()}</div>
        </div>
        <div>
          <div style="font-size:0.6rem;color:var(--text-muted);text-transform:uppercase;">Total Salary</div>
          <div style="font-size:1.3rem;font-weight:800;color:var(--success);font-family:var(--font-mono);">Rs. ${earnedSalary.toLocaleString()}</div>
        </div>
      </div>
      <div style="font-size:0.7rem;color:var(--text-secondary);text-align:center;">
        👤 <strong>${workerName}</strong>${isZaid ? ' ⭐' : ''} • 💰 Rs. ${monthlySalary.toLocaleString()}/month • 📅 ${periodStartStr} — ${periodEndStr} • 📆 ${monthName} (${daysInMonth} days)
      </div>
      <div style="font-size:0.65rem;color:var(--text-muted);text-align:center;margin-top:6px;">
        Formula: ${daysWorked} days × Rs. ${Math.round(dailyRate).toLocaleString()} = <strong style="color:var(--success);">Rs. ${earnedSalary.toLocaleString()}</strong>${isZaid ? ' (0 absents)' : ''}
      </div>
    </div>
  `;
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

// Poll stats every 30 seconds (skip loading screen on refresh)
setInterval(async () => {
  try {
    const [items, wallet, person, maintenance, samples, clipping, bills] = await Promise.all([
      fetchSection('items'), fetchSection('wallet'), fetchSection('person'),
      fetchSection('maintenance'), fetchSection('samples'), fetchSection('clipping'),
      fetchSection('bills')
    ]);
    sectionData.items = items; sectionData.wallet = wallet; sectionData.person = person;
    sectionData.maintenance = maintenance; sectionData.samples = samples; sectionData.clipping = clipping;
    sectionData.bills = bills;

    const itemsEl = document.getElementById('stat-items');
    if (itemsEl) itemsEl.textContent = items.length;
    const badgeItems = document.getElementById('badge-items');
    if (badgeItems) badgeItems.textContent = items.length;

    const balance = wallet.reduce((acc, e) => acc + (e.type === 'in' ? Number(e.amount) : -Number(e.amount)), 0);
    const walletEl = document.getElementById('stat-wallet');
    if (walletEl) { walletEl.textContent = formatCurrency(balance); walletEl.style.color = balance >= 0 ? 'var(--success)' : 'var(--danger)'; }
    const badgeWallet = document.getElementById('badge-wallet');
    if (badgeWallet) badgeWallet.textContent = formatCurrency(balance);

    const today = new Date().toDateString();
    const todayCount = person.filter(e => new Date(e.timestamp).toDateString() === today).length;
    const activityEl = document.getElementById('stat-activity');
    if (activityEl) activityEl.textContent = todayCount;
    const badgePerson = document.getElementById('badge-person');
    if (badgePerson) badgePerson.textContent = todayCount + ' today';

    const openIssues = maintenance.filter(e => e.status !== 'solved').length;
    const issuesEl = document.getElementById('stat-issues');
    if (issuesEl) issuesEl.textContent = openIssues;
    const badgeMaint = document.getElementById('badge-maintenance');
    if (badgeMaint) badgeMaint.textContent = openIssues + ' open';

    const badgeSamples = document.getElementById('badge-samples');
    if (badgeSamples) badgeSamples.textContent = samples.length;
    const badgeClipping = document.getElementById('badge-clipping');
    if (badgeClipping) badgeClipping.textContent = clipping.length;
    const badgeBillsPoll = document.getElementById('badge-bills');
    if (badgeBillsPoll) {
      const billsTotal = bills.reduce((a, e) => a + (Number(e.totalAmount) || 0), 0);
      badgeBillsPoll.textContent = 'Rs. ' + billsTotal.toLocaleString();
    }
  } catch {}
}, 30000);

// Register SW
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}
