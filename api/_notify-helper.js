// Internal notification helper - sends push notifications + WhatsApp messages
const webpush = require('web-push');
const { readFile, writeFile } = require('./_github');

function buildWhatsAppMessage(sectionName, entrySummary, entryData) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  const line = '══════════════════════════════';
  const section = (sectionName || '').toLowerCase();

  let title = '', body = '';
  const e = entryData || {};

  switch (section) {
    case 'items':
      title = '📦 ✦ *NEW ITEM ADDED* ✦ 📦';
      body = `📋 *Name:* ${e.name || 'N/A'}\n🔢 *Serial:* ${e.number || 'N/A'}\n👤 *Person:* ${e.person || 'N/A'}\n📐 *Model:* ${e.model || 'N/A'}\n📊 *Status:* ${e.status || 'available'}`;
      break;
    case 'wallet': {
      const isIn = e.type === 'in';
      title = isIn ? '💰 ✦ *MONEY RECEIVED* ✦ 💰' : '💸 ✦ *MONEY SPENT* ✦ 💸';
      body = `${isIn ? '📥 *From:*' : '📤 *For:*'} ${e.personOrPurpose || 'N/A'}\n💵 *Amount:* Rs. ${Number(e.amount || 0).toLocaleString()}`;
      break;
    }
    case 'person':
    case 'attendance':
      title = '👷 ✦ *WORKER ' + (e.action === 'exit' ? 'CHECKED OUT' : 'CHECKED IN') + '* ✦ 👷';
      body = `👤 *Name:* ${e.personName || 'N/A'}\n✅ *Action:* ${e.action === 'exit' ? 'Exit Logged' : 'Entry Logged'}`;
      break;
    case 'maintenance':
      if (e.status === 'solved') {
        title = '✅ ✦ *ISSUE SOLVED* ✦ ✅';
      } else {
        title = '🔧 ✦ *MAINTENANCE ENTRY* ✦ 🔧';
      }
      body = `🔧 *Type:* ${e.category || 'N/A'}\n📝 *Subject:* ${e.subject || 'N/A'}\n📄 *Desc:* ${e.description || 'N/A'}\n📊 *Status:* ${e.status || 'open'}`;
      break;
    case 'samples':
      title = e.type === 'in' ? '🧪 ✦ *SAMPLE RECEIVED* ✦ 🧪' : '📤 ✦ *SAMPLE SENT* ✦ 📤';
      body = `👤 *Person:* ${e.personName || 'N/A'}\n📋 *Program:* ${e.program || 'N/A'}\n🔢 *Pieces:* ${e.pieces || 'N/A'}`;
      break;
    case 'clipping':
      title = '✂️ ✦ *CLIPPING ENTRY* ✦ ✂️';
      body = `✂️ *Clipper:* ${e.clipperName || 'N/A'}\n📏 *Size:* ${e.size || 'N/A'}\n📥 *Type:* ${e.type === 'in' ? 'Clipped In' : e.type === 'transfer' ? 'Transfer' : 'Out for Clipping'}`;
      break;
    default:
      title = `🔔 ✦ *NEW: ${section.toUpperCase()}* ✦ 🔔`;
      body = `➤ ${entrySummary || JSON.stringify(e)}`;
  }

  const pageUrl = `https://zaidbwp.vercel.app/section.html?page=${section}`;
  return `${title}\n${line}\n${body}\n${line}\n👨‍💻 *ZAID BWP DEVELOPER* 👨‍💻\n📅 ${dateStr}  ⏰ ${timeStr}\n${line}\n🌐 SEE MORE INFO.\n${pageUrl}`;
}

async function sendNotifications(sectionName, entrySummary, entryData) {
  // Send push notifications
  try {
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      console.log('VAPID keys not configured, skipping push notifications');
    } else {
      webpush.setVapidDetails(
        process.env.VAPID_EMAIL || 'mailto:zaid@example.com',
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
      );

      const { data: subscriptions, sha } = await readFile('subscriptions');
      if (subscriptions && subscriptions.length > 0) {
        const payload = JSON.stringify({
          title: 'ZAID BWP STOCK MANAGER',
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

  // Send WhatsApp notification via whatsapp-service (ALWAYS, not just when entryData exists)
  try {
    const botUrl = process.env.WA_SERVICE_URL;
    if (!botUrl) {
      console.log('[WA] WA_SERVICE_URL not set — skipping WhatsApp notification');
      console.log('[WA] Set WA_SERVICE_URL env var on Vercel to enable auto-send');
      return;
    }
    const targetUrl = botUrl.replace(/\/$/, '');
    const apiSecret = process.env.WA_API_SECRET || '';
    const adminNumber = process.env.ADMIN_NUMBER || '923244643714';

    // Build rich WhatsApp message
    const msg = buildWhatsAppMessage(sectionName, entrySummary, entryData);

    console.log('[WA] Sending to +' + adminNumber + ' via ' + targetUrl);

    const waRes = await fetch(`${targetUrl}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: apiSecret,
        message: msg,
        to: adminNumber
      })
    });

    if (!waRes.ok) {
      const errText = await waRes.text();
      console.error('[WA] HTTP ' + waRes.status + ': ' + errText);
      return;
    }

    const waResult = await waRes.json();
    if (waResult.success) {
      console.log('[WA] ✅ Notification queued for +' + adminNumber);
    } else {
      console.log('[WA] ❌ Queue failed: ' + (waResult.error || waResult.message || 'unknown'));
    }
  } catch (err) {
    console.error('[WA] Notification error: ' + err.message);
  }
}

module.exports = { sendNotifications };
