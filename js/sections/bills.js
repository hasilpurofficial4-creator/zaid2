// Bills Section UI renderer
import { formatTimestamp, formatCurrency, escapeHtml, ICONS } from '../shared/utils.js';
import { showDetailModal, showEditModal } from '../shared/modal.js';
import { deleteEntry, updateEntry } from '../shared/api.js';

export function renderBills(container, data, { isAdmin = false, onRefresh } = {}) {
  if (!data || data.length === 0) {
    container.innerHTML = `<div class="empty-state">${ICONS.bills || '🧾'}<p>No bills yet</p></div>`;
    return;
  }

  // Group bills by date
  const grouped = {};
  data.forEach(bill => {
    const dateKey = bill.date || (bill.timestamp ? new Date(bill.timestamp).toISOString().slice(0, 10) : 'unknown');
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(bill);
  });

  // Sort dates descending
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const wrapper = document.createElement('div');
  wrapper.className = 'bills-wrapper';

  sortedDates.forEach(date => {
    const dateSection = document.createElement('div');
    dateSection.className = 'bills-date-group';

    const dateHeader = document.createElement('div');
    dateHeader.className = 'bills-date-header';
    const d = new Date(date + 'T00:00:00');
    const dateLabel = d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
    const dayTotal = grouped[date].reduce((s, b) => s + (Number(b.totalAmount) || 0), 0);
    dateHeader.innerHTML = `
      <span class="bills-date-label">📅 ${dateLabel}</span>
      <span class="bills-date-total">Rs. ${dayTotal.toLocaleString()}</span>
    `;
    dateSection.appendChild(dateHeader);

    grouped[date].forEach(bill => {
      dateSection.appendChild(createBillCard(bill, isAdmin, onRefresh));
    });

    wrapper.appendChild(dateSection);
  });

  container.innerHTML = '';
  container.appendChild(wrapper);
}

function createBillCard(bill, isAdmin, onRefresh) {
  const card = document.createElement('div');
  card.className = 'bill-receipt-card';

  const items = Array.isArray(bill.items) ? bill.items : [];
  const itemsHtml = items.length > 0 ? `
    <table class="bill-items-table">
      <thead>
        <tr><th>Item</th><th>Qty</th><th>Model</th><th>Price</th></tr>
      </thead>
      <tbody>
        ${items.map(it => `
          <tr>
            <td>${escapeHtml(it.name)}</td>
            <td>${it.quantity || 1}</td>
            <td>${escapeHtml(it.model || '-')}</td>
            <td>Rs. ${Number(it.price || 0).toLocaleString()}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  ` : '<div class="bill-no-items">No items</div>';

  const d = bill.timestamp ? new Date(bill.timestamp) : new Date();
  const timeStr = bill.time || d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  card.innerHTML = `
    <div class="bill-receipt-header">
      <div class="bill-receipt-info">
        <div class="bill-receipt-person">👤 ${escapeHtml(bill.personName || 'N/A')}</div>
        <div class="bill-receipt-purpose">📋 ${escapeHtml(bill.billPurpose || 'N/A')}</div>
      </div>
      <div class="bill-receipt-datetime">
        <span>🕐 ${timeStr}</span>
      </div>
    </div>
    <div class="bill-receipt-body">
      ${itemsHtml}
    </div>
    <div class="bill-receipt-total">
      <span>Total</span>
      <span>Rs. ${Number(bill.totalAmount || 0).toLocaleString()}</span>
    </div>
    ${isAdmin ? `
      <div class="bill-receipt-actions">
        <button class="btn btn-icon btn-ghost btn-sm edit-btn">${ICONS.edit}</button>
        <button class="btn btn-icon btn-ghost btn-sm delete-btn">${ICONS.trash}</button>
      </div>
    ` : ''}
  `;

  card.addEventListener('click', (e) => {
    if (e.target.closest('.edit-btn') || e.target.closest('.delete-btn')) return;
    showDetailModal(bill, {
      title: 'Bill — ' + bill.personName,
      fields: [
        { label: 'Person', value: bill.personName },
        { label: 'Purpose', value: bill.billPurpose },
        { label: 'Date', value: bill.date },
        { label: 'Time', value: timeStr },
        { label: 'Items', value: items.length + ' item(s)' },
        { label: 'Total', value: 'Rs. ' + Number(bill.totalAmount || 0).toLocaleString() },
        { label: 'ID', value: bill.id }
      ],
      isAdmin,
      onEdit: () => openEdit(bill, onRefresh),
      onDelete: () => handleDelete(bill.id, onRefresh)
    });
  });

  const editBtn = card.querySelector('.edit-btn');
  if (editBtn) editBtn.addEventListener('click', (e) => { e.stopPropagation(); openEdit(bill, onRefresh); });

  const deleteBtn = card.querySelector('.delete-btn');
  if (deleteBtn) deleteBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (confirm('Delete this bill?')) await handleDelete(bill.id, onRefresh);
  });

  return card;
}

function openEdit(bill, onRefresh) {
  showEditModal(bill, {
    title: 'Edit Bill',
    fields: [
      { key: 'personName', label: 'Person Name', type: 'text' },
      { key: 'billPurpose', label: 'Bill Purpose', type: 'text' },
      { key: 'totalAmount', label: 'Total Amount', type: 'number' },
      { key: 'date', label: 'Date', type: 'text' },
      { key: 'time', label: 'Time', type: 'text' }
    ],
    onSave: async (updated) => {
      await updateEntry('bills', bill.id, updated);
      if (onRefresh) onRefresh();
    }
  });
}

async function handleDelete(id, onRefresh) {
  await deleteEntry('bills', id);
  if (onRefresh) onRefresh();
}
