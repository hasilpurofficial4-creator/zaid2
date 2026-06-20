// Internal notification helper - sends push notifications + WhatsApp messages
const webpush = require('web-push');
const { readFile, writeFile } = require('./_github');

const BOT_NAME = 'UNIT STOCK MANAGEMENT';
const SITE_URL = 'https://zaidbwp.vercel.app';
const LINE = '╔══════════════════════════════╗';
const DIV  = '╠══════════════════════════════╣';
const END  = '╚══════════════════════════════╝';

function buildWhatsAppMessage(sectionName, entrySummary, entryData) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  const section = (sectionName || '').toLowerCase();
  const e = entryData || {};

  let title = '', body = '';

  switch (section) {
    case 'items':
      title = '📦 ✦ *NEW ITEM ADDED* ✦ 📦';
      body = [
        `📋 *Name:* ${e.name || 'N/A'}`,
        `🔢 *Serial:* ${e.number || 'N/A'}`,
        `👤 *Person:* ${e.person || 'N/A'}`,
        `📐 *Model:* ${e.model || 'N/A'}`,
        `📦 *Qty:* ${e.quantity || 1}`,
        `🏷️ *Status:* ${e.status === 'available' ? '🟢' : e.status === 'in-use' ? '🔵' : '🔴'} ${e.status || 'available'}`
      ].join('\n');
      break;

    case 'wallet': {
      const isIn = e.type === 'in';
      title = isIn ? '💰 ✦ *MONEY RECEIVED* ✦ 💰' : '💸 ✦ *MONEY SPENT* ✦ 💸';
      body = [
        `${isIn ? '📥 *From:*' : '📤 *For:*'} ${e.personOrPurpose || 'N/A'}`,
        `💵 *Amount:* Rs. ${Number(e.amount || 0).toLocaleString()}`,
        `🏷️ *Type:* ${isIn ? '📥 Income' : '📤 Expense'}`
      ].join('\n');
      break;
    }

    case 'person':
    case 'attendance':
      title = '👷 ✦ *WORKER ' + (e.action === 'exit' ? 'CHECKED OUT' : 'CHECKED IN') + '* ✦ 👷';
      body = [
        `👤 *Name:* ${e.personName || 'N/A'}`,
        `🏷️ *Action:* ${e.action === 'exit' ? '🔴 Exit Logged' : '🟢 Entry Logged'}`,
        `📅 *Time:* ${timeStr}`
      ].join('\n');
      break;

    case 'maintenance':
      if (e.status === 'solved') {
        title = '✅ ✦ *ISSUE RESOLVED* ✦ ✅';
      } else {
        title = '🔧 ✦ *NEW MAINTENANCE* ✦ 🔧';
      }
      body = [
        `🏷️ *Type:* ${e.category || 'N/A'}`,
        `📝 *Subject:* ${e.subject || 'N/A'}`,
        `📄 *Desc:* ${e.description || 'N/A'}`,
        `📊 *Status:* ${e.status === 'solved' ? '✅ Resolved' : '🔴 Open'}`
      ].join('\n');
      break;

    case 'samples':
      title = e.type === 'in' ? '🧪 ✦ *SAMPLE RECEIVED* ✦ 🧪' : '📤 ✦ *SAMPLE SENT OUT* ✦ 📤';
      body = [
        `👤 *Person:* ${e.personName || 'N/A'}`,
        `📋 *Program:* ${e.program || 'N/A'}`,
        `🔢 *Pieces:* ${e.pieces || 'N/A'}`,
        `🏷️ *Type:* ${e.type === 'in' ? '📥 Sample In' : '📤 Sample Out'}`
      ].join('\n');
      break;

    case 'clipping':
      title = '✂️ ✦ *CLIPPING ENTRY* ✂️';
      body = [
        `✂️ *Clipper:* ${e.clipperName || 'N/A'}`,
        `📏 *Size:* ${e.size || 'N/A'} yards`,
        `🏷️ *Type:* ${e.type === 'in' ? '📥 Clipped In' : e.type === 'transfer' ? '💸 Transfer' : '📤 Out for Clipping'}`
      ].join('\n');
      break;

    default:
      title = `🔔 ✦ *NEW: ${(sectionName || 'ENTRY').toUpperCase()}* ✦ 🔔`;
      body = `➤ ${entrySummary || JSON.stringify(e)}`;
  }

  const pageUrl = `${SITE_URL}/section.html?page=${section}`;

  return [
    title, LINE, body, DIV,
    `🏢 *${BOT_NAME}*`,
    `📅 ${dateStr}  ⏰ ${timeStr}`,
    DIV,
    `🌐 *View Details:*`,
    pageUrl,
    `🔗 ${SITE_URL}`,
    `📱 Admin: +${(process.env.ADMIN_NUMBER || '923299931199').split(',')[0].trim()}`,
    END
  ].join('\n');
}

async function sendNotifications(sectionName, entrySummary, entryData) {
  // Send push notifications
  try {
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      console.log('VAPID keys not configured, skipping push notifications');
    } else {
      webpush.setVapidDetails(
        process.env.VAPID_EMAIL || 'mailto:admin@zaidbwp.vercel.app',
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
      );

      const { data: subscriptions, sha } = await readFile('subscriptions');
      if (subscriptions && subscriptions.length > 0) {
        const payload = JSON.stringify({
          title: BOT_NAME,
          body: `New entry in ${sectionName}: ${entrySummary}`,
          icon: '/icons/icon-192.svg',
          badge: '/icons/icon-192.svg',
          tag: sectionName,
          data: { url: '/index.html' }
        });

        const validSubs = [];
        const sendPromises = subscriptions.map(async (sub) => {
          try {
            await webpush.sendNotification(sub, payload);
            validSubs.push(sub);
          } catch (err) {
            if (err.statusCode === 410 || err.statusCode === 404) {
              console.log('Removing expired subscription');
            } else {
              validSubs.push(sub);
              console.error('Push error:', err.message);
            }
          }
        });

        await Promise.all(sendPromises);

        if (validSubs.length !== subscriptions.length && sha) {
          await writeFile('subscriptions', validSubs, sha);
        }
      }
    }
  } catch (err) {
    console.error('Push notification error:', err.message);
  }

  // Send WhatsApp notification via Railway whatsapp-service to ALL admins
  try {
    const botUrl = process.env.WA_SERVICE_URL;
    if (!botUrl) {
      console.log('[WA] WA_SERVICE_URL not set — skipping WhatsApp notification');
      return;
    }
    const targetUrl = botUrl.replace(/\/$/, '');
    const apiSecret = process.env.WA_API_SECRET || 'banu-saeed-secret-2024';
    // Support comma-separated admin numbers
    const adminNumbers = (process.env.ADMIN_NUMBER || '923299931199')
      .split(',').map(n => n.trim()).filter(Boolean);

    const msg = buildWhatsAppMessage(sectionName, entrySummary, entryData);

    // Send to ALL admin numbers in parallel
    const sendPromises = adminNumbers.map(async (adminNumber) => {
      try {
        console.log('[WA] Sending to +' + adminNumber + ' via ' + targetUrl);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        const waRes = await fetch(`${targetUrl}/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            secret: apiSecret,
            message: msg,
            to: adminNumber
          }),
          signal: controller.signal
        });
        clearTimeout(timeout);

        if (!waRes.ok) {
          const errText = await waRes.text();
          console.error('[WA] HTTP ' + waRes.status + ' for +' + adminNumber + ': ' + errText);
          return;
        }

        const waResult = await waRes.json();
        if (waResult.success) {
          console.log('[WA] ✅ Notification queued for +' + adminNumber);
        } else {
          console.log('[WA] ❌ Queue failed for +' + adminNumber + ': ' + (waResult.error || waResult.message || 'unknown'));
        }
      } catch (err) {
        console.error('[WA] Failed for +' + adminNumber + ': ' + err.message);
      }
    });

    await Promise.all(sendPromises);
  } catch (err) {
    console.error('[WA] Notification error: ' + err.message);
  }
}

module.exports = { sendNotifications };
