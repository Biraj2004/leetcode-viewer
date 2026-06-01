# Leetcode Viewer Extension

Manifest V3 Chrome extension used by Leetcode Viewer to execute LeetCode requests from a real `leetcode.com` tab context.

## Install (Developer Mode)

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select this `extension/` folder

## What it does

1. The web app checks whether the extension is installed.
2. The app asks the extension for current login status (`logged in` / `not logged in`).
3. Run/submit/submission-details requests are sent to the extension.
4. The extension forwards those requests to a live `leetcode.com` tab where browser cookies are naturally applied.
5. While the app is open, the extension heartbeat can trigger periodic CSRF refresh checks.

No manual token copy/paste is required.

## Permissions

| Permission | Why it is needed |
|---|---|
| `cookies` | Read `LEETCODE_SESSION` and `csrftoken` for login/refresh checks |
| `tabs` | Find or create a LeetCode tab for request execution |
| `scripting` | Re-inject `content.js` when needed |
| `storage` | Track app heartbeat and CSRF refresh timestamps |
