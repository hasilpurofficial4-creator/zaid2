// Bills CRUD endpoint
const { readFile, readAndWrite } = require('../_github');
const { validateAuth, unauthorized } = require('../_auth-middleware');
const { sendNotifications } = require('../_notify-helper');

function generateId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = 'bill_';
  for (let i = 0; i < 13; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const { data } = await readFile('bills');
      const sorted = data.sort((a, b) => {
        const tA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const tB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return tB - tA;
      });
      return res.status(200).json(sorted);
    }

    if (!validateAuth(req)) return unauthorized(res);
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    if (req.method === 'POST') {
      const updated = await readAndWrite('bills', (entries) => {
        const items = Array.isArray(body.items) ? body.items : [];
        const totalAmount = items.reduce((sum, it) => sum + (Number(it.price) || 0), 0);
        const date = body.date || new Date().toISOString().slice(0, 10);
        const time = body.time || new Date().toTimeString().slice(0, 5);
        const entry = {
          id: generateId(),
          personName: body.personName || '',
          billPurpose: body.billPurpose || '',
          items,
          totalAmount,
          date,
          time,
          timestamp: new Date(date + 'T' + time + ':00').toISOString()
        };
        entries.push(entry);
        return entries;
      });
      const newest = updated.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
      const label = 'New bill for ' + (newest.personName || 'N/A') + ' — Rs.' + newest.totalAmount;
      await sendNotifications('Bills', label, newest);
      return res.status(201).json(newest);
    }

    if (req.method === 'PUT') {
      const updated = await readAndWrite('bills', (entries) => {
        const idx = entries.findIndex(e => e.id === body.id);
        if (idx === -1) return entries;
        // Recalculate total if items changed
        if (body.items) {
          body.totalAmount = body.items.reduce((sum, it) => sum + (Number(it.price) || 0), 0);
        }
        if (body.date && body.time) {
          body.timestamp = new Date(body.date + 'T' + body.time + ':00').toISOString();
        }
        entries[idx] = { ...entries[idx], ...body, id: entries[idx].id };
        return entries;
      });
      return res.status(200).json(updated.find(e => e.id === body.id) || { success: true });
    }

    if (req.method === 'DELETE') {
      await readAndWrite('bills', (entries) => entries.filter(e => e.id !== body.id));
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Bills API error:', err);
    return res.status(500).json({ error: err.message });
  }
};
