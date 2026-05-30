# Leetcode Viewer Authenticator — Chrome Extension

A **Manifest V3** Chrome Extension that securely reads your `LEETCODE_SESSION` and `csrftoken` cookies and passes them to the Leetcode Viewer web app — no copy-pasting needed!

## How to Install (Developer Mode)

1. Open Chrome and go to `chrome://extensions`
2. Enable **"Developer mode"** (toggle in the top-right corner)
3. Click **"Load unpacked"**
4. Select this `extension/` folder
5. The extension is now installed! Pin it to your toolbar for easy access.

> **Note**: You need to add **PNG icons** named `icon16.png`, `icon48.png`, and `icon128.png` inside the `icons/` folder before loading. You can convert `icons/icon.svg` to PNG using any online converter, or use the placeholder approach below.

## How It Works

1. **From the Leetcode Viewer Settings panel**, click **"Auto-Fetch via Extension"**.
2. The web app sends a secure message to the extension using Chrome's `externally_connectable` API.
3. The extension's background service worker calls `chrome.cookies.get()` for `leetcode.com`.
4. **If you're already logged in** → tokens are returned immediately. No browser navigation needed.
5. **If not logged in** → the extension opens a `leetcode.com/accounts/login/` tab. Once you log in, the extension detects the cookies appearing, closes the tab, and sends the tokens back.
6. The tokens are stored in your app's `localStorage` — the extension never stores them.

## Permissions Explained

| Permission | Why it's needed |
|---|---|
| `cookies` | To read `LEETCODE_SESSION` and `csrftoken` from `leetcode.com` |
| `tabs` | To open/close the login tab if you're not logged in |
| `host_permissions: https://leetcode.com/*` | To access LeetCode's cookies |
| `host_permissions: localhost + vercel.app` | To receive messages from the web app |

## Adding to `externally_connectable`

If you deploy to a **custom domain** (not `*.vercel.app`), add your domain to the `externally_connectable.matches` array in `manifest.json`:

```json
"externally_connectable": {
  "matches": [
    "http://localhost:*/*",
    "https://*.vercel.app/*",
    "https://your-custom-domain.com/*"
  ]
}
```

Then reload the extension in `chrome://extensions`.
