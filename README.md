# USDT Cloud Miner Admin Dashboard

Enterprise Admin Console for USDT Cloud Mining Operations.

## Overview
- Live real-time sync with Google Firebase Firestore (`usdt-cloud-mining-c0fb3`)
- Real-time active miner metrics, session throughput, and USDT wallet balances
- Daily subscription revenue analytics (Pro Rig $9.99, Starter Rig $4.99, Enterprise ASIC $14.99)
- TRC-20 withdrawal verification and payout queue management
- Fully responsive Stitch design system with 100% width stacked charts and dynamic date filtering (24h, 7d, 30d, MTD, Custom)

## Cloudflare Pages Deployment
This repository is configured for one-click deployment on Cloudflare Pages:
1. Connect this GitHub repository (`USDT-Dashboard`) to Cloudflare Pages.
2. Build settings:
   - Framework preset: `None`
   - Build command: leave blank (no build step needed)
   - Build output directory: `/` (root directory)
3. Deploy.
4. Cloudflare Pages automatically mounts the edge functions in `/functions/api` for authentication (`/api/login`, `/api/session`, `/api/logout`).

## Admin Credentials
- Email: `zalavadiyajay3814@gmail.com`
- Password: `Jay@12345`

## Local Development
Run the Python development server locally:
```bash
python3 server.py
```
Open `http://localhost:3000` in your browser.
