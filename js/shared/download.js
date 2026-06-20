// Download utility - Excel (.xlsx), Screenshot (.png), and PDF exports
import { formatTimestamp, formatCurrency } from './utils.js';

// Section column definitions for Excel export
const SECTION_COLUMNS = {
  items: [
    { header: 'Name', key: 'name' },
    { header: 'Serial Number', key: 'number' },
    { header: 'Model', key: 'model' },
    { header: 'Quantity', key: 'quantity' },
    { header: 'Person', key: 'person' },
    { header: 'Status', key: 'status' },
    { header: 'Timestamp', key: 'timestamp', format: formatTimestamp }
  ],
  wallet: [
    { header: 'Person / Purpose', key: 'personOrPurpose' },
    { header: 'Type', key: 'type', format: (v) => v === 'in' ? 'Credit' : 'Debit' },
    { header: 'Amount (Rs.)', key: 'amount' },
    { header: 'Timestamp', key: 'timestamp', format: formatTimestamp }
  ],
  person: [
    { header: 'Worker Name', key: 'personName' },
    { header: 'Action', key: 'action', format: (v) => v === 'enter' ? 'Check In' : 'Check Out' },
    { header: 'Timestamp', key: 'timestamp', format: formatTimestamp }
  ],
  maintenance: [
    { header: 'Subject', key: 'subject' },
    { header: 'Description', key: 'description' },
    { header: 'Category', key: 'category' },
    { header: 'Status', key: 'status' },
    { header: 'Timestamp', key: 'timestamp', format: formatTimestamp }
  ],
  samples: [
    { header: 'Person Name', key: 'personName' },
    { header: 'Program', key: 'program' },
    { header: 'Pieces', key: 'pieces' },
    { header: 'Type', key: 'type', format: (v) => v === 'in' ? 'Sample In' : 'Sample Out' },
    { header: 'Timestamp', key: 'timestamp', format: formatTimestamp }
  ],
  clipping: [
    { header: 'Clipper Name', key: 'clipperName' },
    { header: 'Type', key: 'type', format: (v) => v === 'in' ? 'Clipped In' : v === 'transfer' ? 'Transfer' : 'Out for Clipping' },
    { header: 'Size / Amount', key: 'size' },
    { header: 'Timestamp', key: 'timestamp', format: formatTimestamp }
  ],
  bills: [
    { header: 'Person Name', key: 'personName' },
    { header: 'Bill Purpose', key: 'billPurpose' },
    { header: 'Items Count', key: 'items', format: (v) => Array.isArray(v) ? v.length : 0 },
    { header: 'Total Amount (Rs.)', key: 'totalAmount' },
    { header: 'Date', key: 'date' },
    { header: 'Time', key: 'time' },
    { header: 'Timestamp', key: 'timestamp', format: formatTimestamp }
  ]
};

const SECTION_TITLES = {
  items: 'Items Management',
  wallet: 'Wallet',
  person: 'Person Details',
  maintenance: 'Maintenance',
  samples: 'Sample Management',
  clipping: 'Clipping Details',
  bills: 'Bills Management'
};

/**
 * Export section data as Excel (.xlsx) file
 */
export function downloadXlsx(section, data) {
  if (!data || data.length === 0) {
    alert('No data to export');
    return;
  }

  const columns = SECTION_COLUMNS[section];
  if (!columns) return;

  // Build rows
  const rows = data.map(entry => {
    const row = {};
    columns.forEach(col => {
      let value = entry[col.key] || '';
      if (col.format && value) value = col.format(value);
      row[col.header] = value;
    });
    return row;
  });

  // Add summary for clipping
  if (section === 'clipping') {
    const inEntries = data.filter(e => e.type === 'in');
    let totalSize = 0;
    inEntries.forEach(e => {
      const num = parseFloat(e.size);
      if (!isNaN(num)) totalSize += num;
    });
    rows.push({});
    rows.push({ 'Clipper Name': '--- SUMMARY ---' });
    rows.push({ 'Clipper Name': 'Total Clipped In Size', 'Type': String(totalSize) });
    rows.push({ 'Clipper Name': 'Total Rupees (Size × 12)', 'Type': formatCurrency(totalSize * 12) });
  }

  // Add summary for wallet
  if (section === 'wallet') {
    const balance = data.reduce((acc, e) => acc + (e.type === 'in' ? Number(e.amount) : -Number(e.amount)), 0);
    rows.push({});
    rows.push({ 'Person / Purpose': '--- SUMMARY ---' });
    rows.push({ 'Person / Purpose': 'Current Balance', 'Amount (Rs.)': formatCurrency(balance) });
  }

  // Create workbook
  const ws = XLSX.utils.json_to_sheet(rows, { header: columns.map(c => c.header) });

  // Auto-size columns
  const colWidths = columns.map(col => {
    const maxLen = Math.max(
      col.header.length,
      ...rows.map(r => String(r[col.header] || '').length)
    );
    return { wch: Math.min(maxLen + 2, 35) };
  });
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, SECTION_TITLES[section].substring(0, 31));

  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `${section}_${dateStr}.xlsx`);
}

/**
 * Capture a section card as a high-res canvas
 */
async function captureCard(card) {
  // Temporarily expand section body to show all content
  const body = card.querySelector('.section-body');
  const originalMaxHeight = body ? body.style.maxHeight : '';
  const originalOverflow = body ? body.style.overflow : '';
  if (body) {
    body.style.maxHeight = 'none';
    body.style.overflow = 'visible';
  }

  // Also expand the card overflow
  const originalCardOverflow = card.style.overflow;
  card.style.overflow = 'visible';

  // Close any open dropdowns during capture
  document.querySelectorAll('.download-dropdown.open').forEach(d => d.classList.remove('open'));

  const canvas = await html2canvas(card, {
    scale: 3, // High resolution (3x)
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#f8fafc',
    logging: false,
    windowWidth: card.scrollWidth,
    windowHeight: card.scrollHeight
  });

  // Restore styles
  if (body) {
    body.style.maxHeight = originalMaxHeight;
    body.style.overflow = originalOverflow;
  }
  card.style.overflow = originalCardOverflow;

  return canvas;
}

/**
 * Set loading state on download button
 */
function setLoading(card, loading) {
  const btn = card.querySelector('.download-btn');
  if (!btn) return null;
  const original = btn.innerHTML;
  if (loading) {
    btn.innerHTML = '<span style="font-size:11px;">Capturing...</span>';
    btn.disabled = true;
  } else {
    btn.innerHTML = original;
    btn.disabled = false;
  }
  return original;
}

/**
 * Export section card as high-res PNG screenshot
 */
export async function downloadScreenshot(sectionId) {
  const card = document.getElementById(`section-${sectionId}`);
  if (!card) {
    alert('Section not found');
    return;
  }

  const originalHtml = setLoading(card, true);

  try {
    await new Promise(r => setTimeout(r, 100));
    const canvas = await captureCard(card);

    const link = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);
    link.download = `${sectionId}_${dateStr}.png`;
    link.href = canvas.toDataURL('image/png', 1.0);
    link.click();
  } catch (err) {
    console.error('Screenshot failed:', err);
    alert('Screenshot failed. Please try again.');
  } finally {
    const btn = card.querySelector('.download-btn');
    if (btn) {
      btn.innerHTML = originalHtml;
      btn.disabled = false;
    }
  }
}

/**
 * Export section card as PDF document
 */
export async function downloadPdf(sectionId) {
  const card = document.getElementById(`section-${sectionId}`);
  if (!card) {
    alert('Section not found');
    return;
  }

  const originalHtml = setLoading(card, true);

  try {
    await new Promise(r => setTimeout(r, 100));
    const canvas = await captureCard(card);

    // Create PDF using jsPDF
    const { jsPDF } = window.jspdf;

    // Calculate PDF dimensions to fit the image
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;

    // Use landscape if wider than tall, portrait otherwise
    const isLandscape = imgWidth > imgHeight;
    const pdf = new jsPDF({
      orientation: isLandscape ? 'landscape' : 'portrait',
      unit: 'px',
      format: [imgWidth / 3, imgHeight / 3] // Divide by scale factor (3x)
    });

    const imgData = canvas.toDataURL('image/png', 1.0);
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth / 3, imgHeight / 3);

    const dateStr = new Date().toISOString().slice(0, 10);
    const title = SECTION_TITLES[sectionId] || sectionId;
    pdf.save(`${sectionId}_${dateStr}.pdf`);
  } catch (err) {
    console.error('PDF export failed:', err);
    alert('PDF export failed. Please try again.');
  } finally {
    const btn = card.querySelector('.download-btn');
    if (btn) {
      btn.innerHTML = originalHtml;
      btn.disabled = false;
    }
  }
}

/**
 * Initialize download dropdown event handlers
 */
export function initDownloadButtons() {
  document.querySelectorAll('.download-dropdown').forEach(dropdown => {
    const section = dropdown.dataset.section;
    const btn = dropdown.querySelector('.download-btn');
    const menu = dropdown.querySelector('.download-menu');

    if (!btn || !menu) return;

    // Toggle dropdown
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      // Close all other dropdowns
      document.querySelectorAll('.download-dropdown.open').forEach(d => {
        if (d !== dropdown) d.classList.remove('open');
      });
      dropdown.classList.toggle('open');
    });

    // Handle option clicks
    menu.querySelectorAll('.download-option').forEach(option => {
      option.addEventListener('click', async (e) => {
        e.stopPropagation();
        const format = option.dataset.format;
        dropdown.classList.remove('open');

        if (format === 'xlsx') {
          const data = window.__sectionData?.[section] || [];
          downloadXlsx(section, data);
        } else if (format === 'png') {
          await downloadScreenshot(section);
        } else if (format === 'pdf') {
          await downloadPdf(section);
        }
      });
    });
  });

  // Close dropdowns when clicking outside
  document.addEventListener('click', () => {
    document.querySelectorAll('.download-dropdown.open').forEach(d => {
      d.classList.remove('open');
    });
  });
}
