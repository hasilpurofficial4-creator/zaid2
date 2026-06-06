// Samples Section UI renderer
import { formatTimestamp, escapeHtml, ICONS } from '../shared/utils.js';
import { showDetailModal, showEditModal } from '../shared/modal.js';
import { deleteEntry, updateEntry } from '../shared/api.js';

export function renderSamples(container, data, { isAdmin = false, onRefresh } = {}) {
  const countBadge = document.getElementById('samples-count');
  if (countBadge) countBadge.textContent = `${data.length} entries`;

  if (!data || data.length === 0) {
    container.innerHTML = `<div class="empty-state">${ICONS.flask}<p>No sample entries yet</p></div>`;
    return;
  }

  const wrapper = document.createElement('div');

  // Three columns: Out for Clipping, Sample Out, Sample In
  const columns = document.createElement('div');
  columns.className = 'dual-column';
  columns.style.cssText = 'display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;';

  // Out for Clipping (left)
  const clipCol = document.createElement('div');
  clipCol.className = 'column-out';
  clipCol.innerHTML = `<div class="column-header" style="color:var(--warning);">Out for Clipping</div>`;
  const clipList = document.createElement('div');
  clipList.className = 'entry-list';
  const clipEntries = data.filter(e => e.type === 'out_for_clipping');
  clipEntries.forEach(entry => clipList.appendChild(createRow(entry, isAdmin, onRefresh)));
  if (clipEntries.length === 0) clipList.innerHTML = '<div class="empty-state"><p>None</p></div>';
  clipCol.appendChild(clipList);

  // Sample Out (middle)
  const outCol = document.createElement('div');
  outCol.className = 'column-out';
  outCol.innerHTML = `<div class="column-header" style="color:var(--danger);">Sample Out</div>`;
  const outList = document.createElement('div');
  outList.className = 'entry-list';
  const outEntries = data.filter(e => e.type === 'out');
  outEntries.forEach(entry => outList.appendChild(createRow(entry, isAdmin, onRefresh)));
  if (outEntries.length === 0) outList.innerHTML = '<div class="empty-state"><p>None</p></div>';
  outCol.appendChild(outList);

  // Sample In (right)
  const inCol = document.createElement('div');
  inCol.className = 'column-in';
  inCol.innerHTML = `<div class="column-header" style="color:var(--success);">Sample In</div>`;
  const inList = document.createElement('div');
  inList.className = 'entry-list';
  const inEntries = data.filter(e => e.type === 'in');
  inEntries.forEach(entry => inList.appendChild(createRow(entry, isAdmin, onRefresh)));
  if (inEntries.length === 0) inList.innerHTML = '<div class="empty-state"><p>None</p></div>';
  inCol.appendChild(inList);

  columns.appendChild(clipCol);
  columns.appendChild(outCol);
  columns.appendChild(inCol);
  wrapper.appendChild(columns);
  container.innerHTML = '';
  container.appendChild(wrapper);
}

function getTypeLabel(type) {
  if (type === 'in') return 'Sample In';
  if (type === 'out_for_clipping') return 'Out for Clipping';
  return 'Sample Out';
}

function createRow(entry, isAdmin, onRefresh) {
  const row = document.createElement('div');
  const colorClass = entry.type === 'in' ? 'entry-in' : 'entry-out';
  row.className = `entry-row ${colorClass}`;
  row.innerHTML = `
    <div class="entry-info">
      <div class="entry-title">${escapeHtml(entry.personName)}</div>
      <div class="entry-subtitle">${entry.program ? escapeHtml(entry.program) + ' · ' : ''}${entry.pieces ? escapeHtml(entry.pieces) + ' pcs' : ''} · ${formatTimestamp(entry.timestamp)}</div>
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
      title: getTypeLabel(entry.type),
      fields: [
        { label: 'Type', value: getTypeLabel(entry.type) },
        { label: 'Person', value: entry.personName },
        { label: 'Program', value: entry.program || '-' },
        { label: 'Pieces', value: entry.pieces || '-' },
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
    title: 'Edit Sample Entry',
    fields: [
      { key: 'type', label: 'Type', type: 'select', options: ['in', 'out', 'out_for_clipping'] },
      { key: 'personName', label: 'Person Name', type: 'text' },
      { key: 'program', label: 'Program', type: 'text' },
      { key: 'pieces', label: 'Pieces', type: 'text' }
    ],
    onSave: async (updated) => {
      await updateEntry('samples', entry.id, updated);
      if (onRefresh) onRefresh();
    }
  });
}

async function handleDelete(id, onRefresh) {
  await deleteEntry('samples', id);
  if (onRefresh) onRefresh();
}
