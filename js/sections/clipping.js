// Clipping Section UI renderer
import { formatTimestamp, escapeHtml, ICONS } from '../shared/utils.js';
import { showDetailModal, showEditModal } from '../shared/modal.js';
import { deleteEntry, updateEntry } from '../shared/api.js';

export function renderClipping(container, data, { isAdmin = false, onRefresh } = {}) {
  const countBadge = document.getElementById('clipping-count');
  if (countBadge) countBadge.textContent = `${data.length} entries`;

  if (!data || data.length === 0) {
    container.innerHTML = `<div class="empty-state">${ICONS.scissors}<p>No clipping entries yet</p></div>`;
    return;
  }

  // Calculate total clipped-in sizes
  const inEntries = data.filter(e => e.type === 'in');
  let totalSize = 0;
  inEntries.forEach(e => {
    const num = parseFloat(e.size);
    if (!isNaN(num)) totalSize += num;
  });

  const wrapper = document.createElement('div');

  // Total size display at top
  const totalDiv = document.createElement('div');
  totalDiv.className = 'balance-display balance-positive';
  totalDiv.style.cssText = 'text-align:center;margin-bottom:16px;padding:12px;font-size:1.1rem;';
  totalDiv.innerHTML = `Total Clipped In: <strong>${totalSize}</strong> <span style="font-size:0.8rem;color:var(--text-muted);">(${inEntries.length} entries)</span>`;
  wrapper.appendChild(totalDiv);

  const columns = document.createElement('div');
  columns.className = 'dual-column';

  // Out entries (left)
  const outCol = document.createElement('div');
  outCol.className = 'column-out';
  outCol.innerHTML = `<div class="column-header" style="color:var(--warning);">Out for Clipping</div>`;
  const outList = document.createElement('div');
  outList.className = 'entry-list';
  const outEntries = data.filter(e => e.type === 'out');
  outEntries.forEach(entry => outList.appendChild(createRow(entry, isAdmin, onRefresh)));
  if (outEntries.length === 0) outList.innerHTML = '<div class="empty-state"><p>No out entries</p></div>';
  outCol.appendChild(outList);

  // In entries (right)
  const inCol = document.createElement('div');
  inCol.className = 'column-in';
  inCol.innerHTML = `<div class="column-header" style="color:var(--success);">Clipped In</div>`;
  const inList = document.createElement('div');
  inList.className = 'entry-list';
  inEntries.forEach(entry => inList.appendChild(createRow(entry, isAdmin, onRefresh)));
  if (inEntries.length === 0) inList.innerHTML = '<div class="empty-state"><p>No in entries</p></div>';
  inCol.appendChild(inList);

  columns.appendChild(outCol);
  columns.appendChild(inCol);
  wrapper.appendChild(columns);
  container.innerHTML = '';
  container.appendChild(wrapper);
}

function createRow(entry, isAdmin, onRefresh) {
  const row = document.createElement('div');
  row.className = `entry-row entry-${entry.type === 'in' ? 'in' : 'out'}`;
  row.innerHTML = `
    <div class="entry-info">
      <div class="entry-title">${escapeHtml(entry.clipperName)}</div>
      <div class="entry-subtitle">Size: ${escapeHtml(entry.size) || '-'} · ${formatTimestamp(entry.timestamp)}</div>
    </div>
    ${isAdmin ? `
      <div class="entry-actions" style="opacity:1;">
        <button class="btn btn-icon btn-ghost btn-sm edit-btn">${ICONS.edit}</button>
        <button class="btn btn-icon btn-ghost btn-sm delete-btn">${ICONS.trash}</button>
      </div>
    ` : ''}
  `;

  row.addEventListener('click', (e) => {
    if (e.target.closest('.edit-btn') || e.target.closest('.delete-btn')) return;
    showDetailModal(entry, {
      title: entry.type === 'in' ? 'Clipped In' : 'Out for Clipping',
      fields: [
        { label: 'Type', value: entry.type === 'in' ? 'Clipped In' : 'Out for Clipping' },
        { label: 'Clipper Name', value: entry.clipperName },
        { label: 'Size', value: entry.size || '-' },
        { label: 'Timestamp', value: formatTimestamp(entry.timestamp) },
        { label: 'ID', value: entry.id }
      ],
      isAdmin,
      onEdit: () => openEdit(entry, onRefresh),
      onDelete: () => handleDelete(entry.id, onRefresh)
    });
  });

  const editBtn = row.querySelector('.edit-btn');
  if (editBtn) editBtn.addEventListener('click', (e) => { e.stopPropagation(); openEdit(entry, onRefresh); });

  const deleteBtn = row.querySelector('.delete-btn');
  if (deleteBtn) deleteBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (confirm('Delete this entry?')) await handleDelete(entry.id, onRefresh);
  });

  return row;
}

function openEdit(entry, onRefresh) {
  showEditModal(entry, {
    title: 'Edit Clipping Entry',
    fields: [
      { key: 'type', label: 'Type', type: 'select', options: ['in', 'out'] },
      { key: 'clipperName', label: 'Clipper Name', type: 'text' },
      { key: 'size', label: 'Size', type: 'text' }
    ],
    onSave: async (updated) => {
      await updateEntry('clipping', entry.id, updated);
      if (onRefresh) onRefresh();
    }
  });
}

async function handleDelete(id, onRefresh) {
  await deleteEntry('clipping', id);
  if (onRefresh) onRefresh();
}
