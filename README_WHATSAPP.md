# WhatsApp Integration Setup Guide

## Overview
This project uses WhatsApp Baileys library for:
1. **Pairing Code Authentication** - Link WhatsApp account via pairing code (more reliable than QR)
2. **Instant Notifications** - Send formatted messages to +92 324 4643714 and +92 371 1286436 when entries are added
3. **SMS Commands** - Users can text commands to get Excel files or images of data

## Features Implemented

### 1. WhatsApp Pairing (Admin Panel)
- Click "WhatsApp" button in admin panel header
- Enter phone number with country code (e.g., 923299931199)
- Get pairing code displayed as XXXX-XXXX
- Enter code in WhatsApp: Settings → Linked Devices → Link with phone number
- Session ID starting with `zaidashiq_` is generated and sent to paired number
- Add this Session ID as `WA_SESSION_ID` environment variable on Vercel

### 2. Instant Notifications
When any entry is added (items, wallet, person, maintenance, samples, clipping):
- Formatted message with cool fonts sent instantly to both numbers
- Includes timestamp and ZAID BWP MANAGEMENT header
- Message format:
```
╔═══════════════════════╗
  🏢 *ZAID BWP MANAGEMENT*
  📱 03299931199
╚═══════════════════════╝

📦 *NEW ITEM ADDED*
━━━━━━━━━━━━━━━━━━
🏷️ Name: *Item Name*
🔢 Serial: 123
👤 Person: John
📋 Model: XYZ
📊 Status: Available

━━━━━━━━━━━━━━━━━━
⏰ *12:34 PM, Jan 15, 2025*
📌 _Powered by ZAID BWP_
📞 _03299931199_
```

### 3. SMS Commands
Users can text these commands to receive data:

| Command | Description |
|---------|-------------|
| `itemsms` | Items Excel file |
| `itemspic` | Items image summary |
| `walletms` | Wallet Excel file |
| `walletpic` | Wallet image summary |
| `personms` | Person Excel file |
| `personpic` | Person image summary |
| `maintenancems` | Maintenance Excel file |
| `maintenancepic` | Maintenance image summary |
| `samplesms` | Samples Excel file |
| `samplespic` | Samples image summary |
| `clippingms` | Clipping Excel file |
| `clippingpic` | Clipping image summary |

All responses include header: **Powered by ZAID BWP MANAGEMENT 03299931199**

## Deployment on Vercel

### Required Environment Variables:
1. `GITHUB_TOKEN` - Your GitHub personal access token (repo scope)
2. `GITHUB_REPO` - Your GitHub username/repo (e.g., zaidashiq/stock-manager)
3. `GITHUB_BRANCH` - Branch name (usually `main`)
4. `WA_SESSION_ID` - Session ID received after pairing (starts with `zaidashiq_`)
5. `VAPID_PUBLIC_KEY` - For push notifications (optional)
6. `VAPID_PRIVATE_KEY` - For push notifications (optional)
7. `VAPID_EMAIL` - For push notifications (optional)

### Setup Steps:
1. Deploy to Vercel
2. Add all environment variables in Vercel dashboard
3. Open admin panel, click WhatsApp button
4. Link your WhatsApp using pairing code
5. Copy the Session ID sent to your WhatsApp
6. Add `WA_SESSION_ID` env var in Vercel
7. Redeploy project

## Important Notes

### Why Vercel Works:
- WhatsApp pairing uses serverless functions with 60s timeout
- Session stored in GitHub repo (not server filesystem)
- Send operations use temporary `/tmp` directory (available in serverless)
- All Baileys auth state saved to GitHub for persistence

### If Issues Occur:
The current setup IS designed for Vercel. However, if you face any issues:

**Alternative Free Backend: Render.com**
1. Create free web service on render.com
2. Connect your GitHub repo
3. Set same environment variables
4. No changes needed to code - it works on both platforms

**Alternative: Railway.app**
1. Deploy to Railway
2. Add environment variables
3. Same code works without modification

## File Structure
```
/api/
  whatsapp.js           - Pairing code endpoint
  whatsapp-send.js      - Send messages & handle commands
  whatsapp-webhook.js   - Receive incoming messages (future use)
  _whatsapp-session.js  - Session management
  _notify-helper.js     - Notification helper
  data/*.js            - CRUD endpoints with WhatsApp notify
```

## Testing
1. Link WhatsApp from admin panel
2. Add test entry in any section
3. Check if both numbers receive formatted message
4. Text `itemsms` from linked number to test command response

---
**Developed by ZAID ASHIQ BWP**
**Contact: 03299931199**
