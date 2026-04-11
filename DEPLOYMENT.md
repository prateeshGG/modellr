# SchemaForge Deployment Guide

This document outlines the production architecture and deployment steps for SchemaForge, ensuring the application can be maintained, restarted, or moved easily in the future.

## Architecture Overview

SchemaForge relies on a decoupled architecture for maximum performance and cost-efficiency:
1.  **Frontend (React/Vite)**: Hosted on Vercel.
2.  **Backend (Node.js/Yjs WebSockets)**: Hosted on an AWS EC2 Instance.
3.  **Database / Auth**: Hosted on Supabase (PostgreSQL + GoTrue Auth).
4.  **Reverse Proxy / SSL**: Managed by Caddy on the EC2 instance using an `sslip.io` wildcard domain to provide free automatic HTTPS.

---

## 1. Backend Deployment (AWS EC2)

The backend handles the real-time collaborative WebSocket connections (Yjs) and connects securely to the OpenAI API for schema generation.

### Server Details
*   **IP Address**: `13.61.7.14`
*   **Host URL**: `https://13-61-7-14.sslip.io`
*   **Process Manager**: PM2
*   **Reverse Proxy**: Caddy

### Setup Instructions & Base Commands (If deploying to a brand new EC2 instance)

If you ever need to spin up a completely new server (e.g., Ubuntu Linux), run these exact terminal commands to install all the required software natively:

```bash
# 1. Update system packages
sudo apt update && sudo apt upgrade -y

# 2. Install Node.js (v20) and npm
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 3. Install PM2 globally
sudo npm install -g pm2

# 4. Install Caddy (for Reverse Proxy & Automatic SSL)
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy
```

### Launching the Backend Code
Once the software above is installed, pull down the code and start it:

```bash
# 1. Clone your project (replace with your repo URL)
git clone https://github.com/prateesh7777/SchemaForge.git
cd SchemaForge/server

# 2. Install dependencies
npm install

# 3. Create your environment variables file
nano .env
```
*(Add `PORT=1234` and `OPENAI_API_KEY=your_key` to this file, then save and exit `Ctrl+O`, `Enter`, `Ctrl+X`)*

```bash
# 4. Start the server using PM2
pm2 start index.js --name "schemaforge-backend"

# 5. Save the PM2 process so it restarts if the AWS EC2 server reboots
pm2 save
pm2 startup
```
### Reverse Proxy & SSL (Caddy) Commands
Since WebSockets (`wss://`) require HTTPS to function properly in modern browsers, we use Caddy and `sslip.io` (a free DNS resolution service that maps IPs to hostnames) to automatically provision free SSL certificates.

Run this command to edit the Caddyfile:
```bash
sudo nano /etc/caddy/Caddyfile
```

Replace the contents of the file with this block:
```caddyfile
13-61-7-14.sslip.io {
    reverse_proxy localhost:1234
}
```
*(Save and exit `Ctrl+O`, `Enter`, `Ctrl+X`)*

Restart the proxy to apply the changes and fetch the SSL certificate:
```bash
sudo systemctl restart caddy
```

---

## 2. Frontend Deployment (Vercel)

The React SPA is deployed to Vercel, providing a global CDN edge delivery for the static bundle.

### Environment Variables (Vercel Dashboard)
You must set the following Environment Variables in the Vercel Project Settings:

*   `VITE_API_URL`: `https://13-61-7-14.sslip.io` *(Points to the EC2 backend)*
*   `VITE_SUPABASE_URL`: `your_supabase_project_url`
*   `VITE_SUPABASE_ANON_KEY`: `your_supabase_anon_key`

### Deployment Steps
The frontend is built using standard Vite processes. Vercel detects this automatically.
1.  **Build Command**: `npm run build`
2.  **Output Directory**: `dist`
3.  **Install Command**: `npm install`

Whenever you push code to GitHub (or use the Vercel CLI `vercel --prod`), Vercel will automatically build the `dist` folder and deploy it to your domain.

---

## 3. Database Deployment (Supabase)

SchemaForge uses Supabase for database storage, Row Level Security (RLS), and Authentication.

1. **Database Schema**: 
   Ensure your Supabase PostgreSQL instance has the `schemas` table deployed. The table tracks ownership (`owner_id`), visibility (`is_public`), and the JSON string payload for offline sync.
2. **Authentication**:
   - Ensure **Email/Password** sign-in is enabled.
   - Ensure **Anonymous Sign-ins** are enabled (Critical for allowing guests to view/collaborate on shared rooms without forcing an account creation).

---

## Maintenance & Troubleshooting

*   **If the Real-time Collaborative Canvas isn't syncing:**
    *   SSH into your EC2 instance (`ssh ubuntu@13.61.7.14`).
    *   Check server logs: `pm2 logs schemaforge-backend`.
    *   Restart the server if frozen: `pm2 restart schemaforge-backend`.
*   **If AI Generation fails:**
    *   Verify the `OPENAI_API_KEY` in the `/server/.env` file on the EC2 instance hasn't expired.
*   **Need to change backend IP?**
    *   If you move to a new EC2 instance, update the `VITE_API_URL` environment variable inside Vercel to match the new `sslip.io` address and redeploy the frontend.
