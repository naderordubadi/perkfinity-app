---
description: How to build and push a new iOS TestFlight build for Perkfinity
---

// turbo-all

1. Load nvm and build the Next.js static export from the App-Perkfinity directory:
   `export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" && npm run build`

2. Sync the web output to the iOS Capacitor project:
   `export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" && npx cap sync ios`

3. Open Xcode:
   `export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" && npx cap open ios`

4. In Xcode:
   - Bump the **Build Number** (e.g. 1 → 2) under the Target → General tab
   - Select **Any iOS Device (arm64)** as the build target
   - Go to **Product → Archive**
   - Once archived, click **Distribute App → TestFlight & App Store → Next → Upload**
