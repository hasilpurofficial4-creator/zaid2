// Person Details Section UI renderer - Dynamic workers + time editing
import { formatTimestamp, formatShortTime, escapeHtml, calculateHours, getAbsents, getMonthName, ICONS } from '../shared/utils.js';
import { showDetailModal, showEditModal } from '../shared/modal.js';
import { createEntry, deleteEntry, updateEntry } from '../shared/api.js';

export function renderPerson(container, data, { isAdmin = false, onRefresh } = {}) {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();

  // Extract unique workers dynamically from data
  const workerSet = new Set();
  const defaultWorkers = ['Nadeem', 'Zeeshan'];
  defaultWorkers.forEach(w => workerSet.add(w));
  if (data && data.length > 0) {
    data.forEach(e => { if (e.personName) workerSet.add(e.personName); });
  }
  const workers = [...workerSet].sort();

  const wrapper = document.createElement('div');
  wrapper.innerHTML = `<div style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:var(--space-md);text-align:center;">${getMonthName(month)} ${year}</div>`;

  const grid = document.createElement('div');
  grid.className = 'attendance-grid';

  workers.forEach(name => {
    const card = document.createElement('div');
    card.className = 'worker-card';

    const hours = calculateHours(data, name, month, year);
    const absents = getAbsents(data, name, month, year);

    card.innerHTML = `
      <div class="worker-name">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        ${escapeHtml(name)}
      </div>
      ${isAdmin ? `
        <div class="worker-actions">
          <button class="btn btn-success btn-sm mark-enter-btn">${ICONS.login} Enter</button>
          <button class="btn btn-danger btn-sm mark-exit-btn">${ICONS.logout} Exit</button>
        </div>
      ` : ''}
      <div class="worker-stats">
        <div class="stat-box">
          <div class="stat-value">${hours.totalHours}h</div>
          <div class="stat-label">Hours</div>
        </div>
        <div class="stat-box">
          <div class="stat-value">${absents}</div>
          <div class="stat-label">Absents</div>
        </div>
      </div>
    `;

    // Enter/Exit buttons
    const enterBtn = card.querySelector('.mark-enter-btn');
    if (enterBtn) {
      enterBtn.addEventListener('click', async () => {
        await createEntry('person', { personName: name, action: 'enter' });
        if (onRefresh) onRefresh();
      });
    }

    const exitBtn = card.querySelector('.mark-exit-btn');
    if (exitBtn) {
      exitBtn.addEventListener('click', async () => {
        await createEntry('person', { personName: name, action: 'exit' });
        if (onRefresh) onRefresh();
      });
    }

    // Show today's entries
    const todayStr = now.toDateString();
    const todayEntries = data.filter(e =>
      e.personName === name && new Date(e.timestamp).toDateString() === todayStr
    ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    if (todayEntries.length > 0) {
      const todayDiv = document.createElement('div');
      todayDiv.style.cssText = 'margin-top:12px;border-top:1px solid var(--border);padding-top:8px;';
      todayDiv.innerHTML = `<div style="font-size:0.7rem;font-weight:600;color:var(--text-muted);margin-bottom:4px;">TODAY</div>`;

      todayEntries.forEach(entry => {
        const eRow = document.createElement('div');
        eRow.className = `entry-row entry-${entry.action === 'enter' ? 'in' : 'out'}`;
        eRow.style.cssText = 'padding:4px 8px;cursor:pointer;';
        eRow.innerHTML = `
          <div class="entry-info">
            <span class="section-badge ${entry.action === 'enter' ? 'badge-success' : 'badge-danger'}">${entry.action === 'enter' ? 'Enter' : 'Exit'}</span>
          </div>
          <span class="entry-timestamp">${formatShortTime(entry.timestamp)}</span>
          ${isAdmin ? `
            <div style="display:flex;gap:2px;">
              <button class="btn btn-icon btn-ghost btn-sm time-btn" title="Edit time">${ICONS.clock}</button>
              <button class="btn btn-icon btn-ghost btn-sm del-btn">${ICONS.trash}</button>
            </div>
          ` : ''}
        `;

        // Edit time (admin)
        const timeBtn = eRow.querySelector('.time-btn');
        if (timeBtn) {
          timeBtn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            openTimeEdit(entry, onRefresh);
          });
        }

        eRow.addEventListener('click', (ev) => {
          if (ev.target.closest('.del-btn') || ev.target.closest('.time-btn')) return;
          showDetailModal(entry, {
            title: `${name} - ${entry.action === 'enter' ? 'Entry' : 'Exit'}`,
            fields: [
              { label: 'Worker', value: name },
              { label: 'Action', value: entry.action === 'enter' ? 'Entry' : 'Exit' },
              { label: 'Time', value: formatTimestamp(entry.timestamp) }
            ],
            isAdmin,
            onEdit: () => openTimeEdit(entry, onRefresh),
            onDelete: async () => {
              await deleteEntry('person', entry.id);
              if (onRefresh) onRefresh();
            }
          });
        });

        const delBtn = eRow.querySelector('.del-btn');
        if (delBtn) delBtn.addEventListener('click', async (ev) => {
          ev.stopPropagation();
          if (confirm('Delete this entry?')) {
            await deleteEntry('person', entry.id);
            if (onRefresh) onRefresh();
          }
        });

        todayDiv.appendChild(eRow);
      });

      card.appendChild(todayDiv);
    }

    grid.appendChild(card);
  });

  wrapper.appendChild(grid);

  // Recent history below
  const recentEntries = data.slice(0, 20);
  if (recentEntries.length > 0) {
    const histDiv = document.createElement('div');
    histDiv.style.cssText = 'margin-top:var(--space-md);border-top:1px solid var(--border);padding-top:var(--space-md);';
    histDiv.innerHTML = `<div style="font-size:0.75rem;font-weight:600;color:var(--text-muted);margin-bottom:8px;">RECENT ACTIVITY</div>`;
    const list = document.createElement('div');
    list.className = 'entry-list';

    recentEntries.forEach(entry => {
      const row = document.createElement('div');
      row.className = `entry-row entry-${entry.action === 'enter' ? 'in' : 'out'}`;
      row.style.cursor = 'pointer';
      row.innerHTML = `
        <div class="entry-info">
          <div class="entry-title">${escapeHtml(entry.personName)}</div>
          <div class="entry-subtitle">${entry.action === 'enter' ? 'Checked In' : 'Checked Out'}</div>
        </div>
        <span class="entry-timestamp">${formatTimestamp(entry.timestamp)}</span>
        ${isAdmin ? `<button class="btn btn-icon btn-ghost btn-sm time-edit-btn" title="Edit time">${ICONS.clock}</button>` : ''}
      `;

      const timeEditBtn = row.querySelector('.time-edit-btn');
      if (timeEditBtn) {
        timeEditBtn.addEventListener('click', (ev) => {
          ev.stopPropagation();
          openTimeEdit(entry, onRefresh);
        });
      }

      row.addEventListener('click', (ev) => {
        if (ev.target.closest('.time-edit-btn')) return;
        showDetailModal(entry, {
          title: `${entry.personName} - ${entry.action === 'enter' ? 'Entry' : 'Exit'}`,
          fields: [
            { label: 'Worker', value: entry.personName },
            { label: 'Action', value: entry.action === 'enter' ? 'Entry' : 'Exit' },
            { label: 'Time', value: formatTimestamp(entry.timestamp) }
          ],
          isAdmin,
          onEdit: () => openTimeEdit(entry, onRefresh),
          onDelete: async () => {
            await deleteEntry('person', entry.id);
            if (onRefresh) onRefresh();
          }
        });
      });

      list.appendChild(row);
    });

    histDiv.appendChild(list);
    wrapper.appendChild(histDiv);
  }

  container.innerHTML = '';
  container.appendChild(wrapper);
}

// Open time edit modal
function openTimeEdit(entry, onRefresh) {
  const d = new Date(entry.timestamp);
  const dateStr = d.toISOString().slice(0, 16); // yyyy-MM-ddTHH:mm

  showEditModal(entry, {
    title: `Edit ${entry.personName}'s ${entry.action === 'enter' ? 'Entry' : 'Exit'} Time`,
    fields: [
      { key: 'timestamp', label: 'Date & Time', type: 'datetime-local', value: dateStr }
    ],
    onSave: async (updated) => {
      if (updated.timestamp) {
        updated.timestamp = new Date(updated.timestamp).toISOString();
      }
      await updateEntry('person', entry.id, updated);
      if (onRefresh) onRefresh();
    }
  });
}
