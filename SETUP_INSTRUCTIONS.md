# WhatsApp Integration Setup Guide

## Overview
This project uses a split architecture:
- **Backend** (whatsapp-bot): Runs on Render.com - handles WhatsApp connection, pairing, commands
- **Frontend** (Vercel): Admin panel with pairing button and entry management

## Step 1: Deploy Backend to Render.com

### A. Push whatsapp-bot folder to GitHub
```bash
cd /workspace/whatsapp-bot
git init
git add .
git commit -m "Initial commit - WhatsApp bot backend"
git branch -M main
# Create new repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/zaid-whatsapp-bot.git
git push -u origin main
```

### B. Deploy on Render
1. Go to https://render.com and login
2. Click **"New +"** → **"Web Service"**
3. Connect GitHub and select your `zaid-whatsapp-bot` repository
4. Configure:
   - **Name**: `zaid-whatsapp-backend`
   - **Region**: Singapore (closest to Pakistan)
   - **Branch**: `main`
   - **Root Directory**: Leave blank (if repo root is whatsapp-bot folder) OR enter `whatsapp-bot`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free
5. Click **"Create Web Service"**
6. Wait for deployment (~2-3 minutes)
7. Copy the URL (e.g., `https://zaid-whatsapp-backend.onrender.com`)

## Step 2: Configure Frontend (Vercel)

### A. Add Environment Variable
In your Vercel project settings or `.env.local`:
```
NEXT_PUBLIC_WHATSAPP_BACKEND_URL=https://your-render-app-url.onrender.com
```

### B. Add Pairing Button to Admin Page
Import and use the component in your admin page:
```tsx
import AdminWhatsapp from '@/components/AdminWhatsapp';

// In your admin page JSX:
<AdminWhatsapp />
```

### C. Add Notification Function
When adding entries, call this function:
```typescript
async function notifyWhatsapp(entryData: any) {
  const backendUrl = process.env.NEXT_PUBLIC_WHATSAPP_BACKEND_URL;
  if (!backendUrl) return;
  
  await fetch(`${backendUrl}/api/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: `Item: ${entryData.name}\nPrice: ${entryData.price}`,
      entryData
    }),
  });
}
```

## Step 3: Link WhatsApp

1. Go to your admin page on Vercel
2. Navigate to WhatsApp Linking section
3. Enter the number you want to use as sender (e.g., your business number)
4. Click **"Get Pairing Code"**
5. **Wait 30-40 seconds** (Render free tier wakes up)
6. Copy the code displayed
7. On your phone:
   - Open WhatsApp
   - Settings → Linked Devices
   - Tap "Link a Device"
   - Choose **"Link with Phone Number"** (at bottom)
   - Enter the code
8. Check Render logs - you'll see:
   ```
   ✅ Connected to WhatsApp!
   🆔 Session ID: zaidashiq_923xxxxxxxxx
   ```

## Step 4: Test Commands

From another WhatsApp number, send to the linked number:
- `itemsms` → Receives items Excel file
- `itemspic` → Receives items image
- `clippingms` → Receives clipping Excel file
- `clippingpic` → Receives clipping image

All responses include: "Powered by ZAID BWP MANAGEMENT 03299931199"

## Step 5: Test Entry Notifications

1. Add a new entry in your admin panel
2. Call `notifyWhatsapp()` function
3. Both numbers (+92 324 4643714, +92 371 1286436) receive:
   - Formatted message with cool fonts
   - Timestamp (Asia/Karachi timezone)
   - Header: "Powered by ZAID BWP MANAGEMENT 03299931199"

## Troubleshooting

### "Connection Failure" Error
- Wait 30 seconds and try again (Render waking up)
- Check Render logs for specific errors
- Ensure number format is correct (no +, no spaces: 923244643714)

### Backend Not Responding
- Visit the Render URL directly to wake it up
- Check Render dashboard for crashes/errors
- Free tier spins down after 15 mins of inactivity

### Session Lost After Redeploy
- Render persists `auth_info_baileys` folder between deploys
- If lost, just re-pair using the admin panel

## Session ID Usage

The Session ID (`zaidashiq_923xxxxxxxxx`) is automatically generated and logged.
If needed for manual configuration, find it in Render logs after successful pairing.

## Files Structure
```
/workspace
├── whatsapp-bot/          # Backend for Render
│   ├── package.json
│   ├── index.js
│   ├── .gitignore
│   └── README.md
├── components/
│   └── AdminWhatsapp.tsx  # Frontend pairing component
└── SETUP_INSTRUCTIONS.md  # This file
```
