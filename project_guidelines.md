# 🚨 CRITICAL: READ BEFORE STARTING WORK

## 🎯 Primary Project Goal
**The user wants to see results ONLINE (Production), not locally.**
- All development should prioritize connecting to the **Production Railway Backend**.
- Avoid defaulting to `localhost` or local environments unless explicitly requested.

## 📱 Development Environment
- **Platform**: iOS App (Expo / React Native)
- **IDE**: Xcode on macOS
- **Testing Device**: **Physical iPhone** (Real Hardware)
- **Network**: The physical device needs a publicly accessible API URL (Railway) or a local LAN IP (e.g., `192.168.x.x`), NOT `localhost`.

## 🌐 Backend Architecture
- **Production Backend URL**: `https://gpssaasplatform-production.up.railway.app`
- **Database**: **Railway MySQL Production Database**
  - Host: `turntable.proxy.rlwy.net`
  - Port: `23429`
  - User: `root`
  - DB Name: `railway`
- **Local Backend**: Only used for specific backend logic testing (port 4000), but connected to the **Production Database**.

## 🧪 Testing & Simulation Workflow
1. **Start Metro Bundler**:
   - Run `npx expo start --clear` in `mobile/`.
   - Ensure your iPhone is on the same Wi-Fi network as your Mac.
   - Scan the QR code or select your device from the list.

2. **Prepare Backend (For Simulator Only)**:
   - Ensure `backend/.env` is configured to connect to the **Production Database**.
   - Run `npm run dev` in `backend/`.
     - This starts the HTTP server on port 4000.
     - This starts the TCP Server on port **5001** (Required for Simulator).

3. **Run GPS Simulator**:
   - Run `python3 simulate_movement_hq.py` in `backend/`.
   - This script sends GPS data to `localhost:5001` (Local Backend).
   - The Local Backend then processes this data and updates the **Production Database**.
   - You should see the vehicle moving on your physical device.

## ⚠️ Common Pitfalls to AVOID
1. **DO NOT** configure the mobile app to connect to `localhost` or `127.0.0.1`. It will fail on the physical device.
2. **DO NOT** assume the user wants a local database. The project uses the **Production Railway Database** for all data.
3. **DO NOT** suggest using the iOS Simulator unless the user specifically asks. The primary workflow is on a real device.
4. **DO NOT** change the Google Maps region settings in the code. The map region behavior is controlled by the device's iOS settings.

## 🛠️ Key Configuration Files
- **Mobile API Config**: `mobile/constants/Config.ts`
  - Ensure `API_URL` points to the **Production URL** by default.
  - Development logic should use the production URL to ensure consistency with the physical device.
- **Backend Env**: `backend/.env`
  - Ensure `DB_HOST`, `DB_USER`, `DB_PASSWORD`, etc., match the **Railway Production Database** credentials.

## 🔄 Workflow for New Tasks
1. **Always verify connectivity** to the production backend first.
2. **Check `Config.ts`** to ensure the app is pointing to the correct online environment.
3. **Assume testing on a physical iPhone** and ensure network configurations support this.

## 🚀 Deployment Strategy
- **Auto-Push to GitHub**:
  - Whenever a task, bug fix, or feature is completed and verified, **automatically push the changes to GitHub** (`origin master` or `origin main`).
  - **DO NOT ask for permission** to push. The user expects continuous integration with Railway.
  - Ensure the commit message is descriptive (e.g., `fix: resolve history jumping issue`).
