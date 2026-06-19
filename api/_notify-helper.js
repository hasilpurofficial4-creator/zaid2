// Internal notification helper - sends push notifications + WhatsApp messages
const webpush = require('web-push');
const { readFile, writeFile } = require('./_github');

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

  // Send WhatsApp notification via whatsapp-service
  if (entryData) {
    try {
      const botUrl = process.env.WA_SERVICE_URL;
      if (!botUrl) { console.log('WA_SERVICE_URL not set - skipping WhatsApp'); return; }
      const targetUrl = botUrl.replace(/\/$/, '');
      const apiSecret = process.env.WA_API_SECRET || '';

      // Build message from entry data
      const section = sectionName.toLowerCase();
      let summary = entrySummary || '';
      const msg = `📋 *NEW ${section.toUpperCase()} ENTRY*\n${summary}\n\n🌐 https://zaidbwp.vercel.app`;

      const waRes = await fetch(`${targetUrl}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: apiSecret,
          message: msg,
          to: process.env.ADMIN_NUMBER || '923244643714'
        })
      });
      const waResult = await waRes.json();
      if (waResult.success) {
        console.log('WhatsApp notification queued for admin');
      } else {
        console.log('WhatsApp notification result:', waResult.error || waResult.message);
      }
    } catch (err) {
      console.error('WhatsApp notification error:', err.message);
    }
  }
}

module.exports = { sendNotifications };
