/**
 * background.js — Service Worker (Manifest V3)
 *
 * Handles cookie fetching, active session validation, and clearing tokens.
 */

const LC_ORIGIN = "https://leetcode.com";

// ── Helper: get LeetCode cookies ─────────────────────────────────────────────

async function getLCCookies() {
  const [sessionCookie, csrfCookie] = await Promise.all([
    chrome.cookies.get({ url: LC_ORIGIN, name: "LEETCODE_SESSION" }),
    chrome.cookies.get({ url: LC_ORIGIN, name: "csrftoken" }),
  ]);
  return {
    session: sessionCookie?.value ?? null,
    csrf:    csrfCookie?.value    ?? null,
  };
}

async function validateLCCookies(session, csrf) {
  console.log("[LV-ext] Validating LeetCode session tokens...");
  if (!session || !csrf) {
    console.log("[LV-ext] Validation skipped: cookies missing");
    return false;
  }
  try {
    console.log("[LV-ext] Sending GraphQL userStatus request to LeetCode...");
    const response = await fetch("https://leetcode.com/graphql", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-csrftoken": csrf,
      },
      body: JSON.stringify({
        query: `
          query globalCommonHeader {
            userStatus {
              isSignedIn
              username
            }
          }
        `
      })
    });
    const json = await response.json();
    const isSignedIn = !!json?.data?.userStatus?.isSignedIn;
    const username = json?.data?.userStatus?.username || "unknown";
    console.log(`[LV-ext] Validation result: isSignedIn=${isSignedIn}, username=${username}`);
    return isSignedIn;
  } catch (e) {
    console.error("[LV-ext] Session validation failed with error:", e);
    return false;
  }
}

// ── Helper: wait for cookies to appear (polling) ──────────────────────────────

function waitForCookies(tabId, timeoutMs = 120_000) {
  return new Promise((resolve, reject) => {
    const interval = 1500;
    let elapsed = 0;

    const timer = setInterval(async () => {
      elapsed += interval;
      const { session, csrf } = await getLCCookies();

      if (session && csrf) {
        // Double check validation before resolving
        const isValid = await validateLCCookies(session, csrf);
        if (isValid) {
          clearInterval(timer);
          // Close the LeetCode tab we opened
          try { await chrome.tabs.remove(tabId); } catch (_) {}
          resolve({ session, csrf });
          return;
        }
      }

      if (elapsed >= timeoutMs) {
        clearInterval(timer);
        reject(new Error("Timed out waiting for LeetCode login."));
      }
    }, interval);
  });
}

// ── Core fetch handler ────────────────────────────────────────────────────────

async function handleFetchTokens(force = false) {
  console.log(`[LV-ext] handleFetchTokens called. force=${force}`);
  if (!force) {
    // 1. Check if cookies already exist and are valid
    const existing = await getLCCookies();
    if (existing.session && existing.csrf) {
      console.log("[LV-ext] Found existing session cookies. Validating...");
      const isValid = await validateLCCookies(existing.session, existing.csrf);
      if (isValid) {
        console.log("[LV-ext] Existing session is VALID. Returning credentials.");
        return { success: true, session: existing.session, csrf: existing.csrf, alreadyLoggedIn: true };
      }
      console.log("[LV-ext] Existing session is INVALID/EXPIRED.");
    } else {
      console.log("[LV-ext] No existing session cookies found in browser.");
    }
  }

  // 2. Clear old session to force login screen
  console.log("[LV-ext] Clearing browser LeetCode cookies to ensure fresh login flow...");
  await clearLCCookies();

  // 3. Open LeetCode login tab
  console.log("[LV-ext] Opening LeetCode login page in active tab...");
  const tab = await chrome.tabs.create({ url: "https://leetcode.com/accounts/login/", active: true });

  try {
    console.log(`[LV-ext] Polling for new cookies on tab ID: ${tab.id}...`);
    const tokens = await waitForCookies(tab.id);
    console.log("[LV-ext] Successfully retrieved and validated new credentials.");
    return { success: true, ...tokens, alreadyLoggedIn: false };
  } catch (err) {
    console.error("[LV-ext] Login process failed:", err.message);
    // Try to close the tab if still open
    try { await chrome.tabs.remove(tab.id); } catch (_) {}
    return { success: false, error: err.message };
  }
}

// ── Clear tokens handler ──────────────────────────────────────────────────────

async function clearLCCookies() {
  console.log("[LV-ext] Removing LEETCODE_SESSION and csrftoken cookies from browser...");
  await Promise.all([
    chrome.cookies.remove({ url: LC_ORIGIN, name: "LEETCODE_SESSION" }),
    chrome.cookies.remove({ url: LC_ORIGIN, name: "csrftoken" }),
  ]);
  console.log("[LV-ext] Cookies cleared successfully.");
}

async function handleClearTokens() {
  // Do not remove browser cookies when the user clears tokens in the web app
  return { success: true };
}

// ── Message listener (from popup/content script) ──────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "FETCH_LC_TOKENS") {
    handleFetchTokens(message.force).then(sendResponse).catch((err) =>
      sendResponse({ success: false, error: err.message })
    );
    return true;
  }

  if (message.type === "CHECK_LC_TOKENS") {
    getLCCookies().then(({ session, csrf }) => {
      sendResponse({ success: true, hasTokens: !!(session && csrf), session, csrf });
    });
    return true;
  }

  if (message.type === "CLEAR_LC_TOKENS") {
    handleClearTokens().then(sendResponse).catch((err) =>
      sendResponse({ success: false, error: err.message })
    );
    return true;
  }
});
