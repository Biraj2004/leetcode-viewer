/**
 * background.js - Service Worker (Manifest V3)
 *
 * Responsibilities:
 * - Fetch/check LeetCode auth cookies for the app settings flow
 * - Route LeetCode judge calls through a real leetcode.com tab
 * - Re-inject content.js into already-open matching tabs after install/update
 */

const LC_ORIGIN = "https://leetcode.com";
const LC_TAB_URL = "https://leetcode.com/problemset/";

async function getLCCookies() {
  const [sessionCookie, csrfCookie] = await Promise.all([
    chrome.cookies.get({ url: LC_ORIGIN, name: "LEETCODE_SESSION" }),
    chrome.cookies.get({ url: LC_ORIGIN, name: "csrftoken" }),
  ]);
  return {
    session: sessionCookie?.value ?? null,
    csrf: csrfCookie?.value ?? null,
  };
}

async function validateLCCookies(session, csrf) {
  if (!session || !csrf) return false;
  try {
    const response = await fetch(`${LC_ORIGIN}/graphql/`, {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json",
        "x-csrftoken": csrf,
        origin: LC_ORIGIN,
        referer: `${LC_ORIGIN}/`,
      },
      body: JSON.stringify({
        query: `
          query globalCommonHeader {
            userStatus {
              isSignedIn
            }
          }
        `,
      }),
    });
    const json = await response.json();
    return !!json?.data?.userStatus?.isSignedIn;
  } catch {
    return false;
  }
}

function waitForCookies(tabId, timeoutMs = 120000) {
  return new Promise((resolve, reject) => {
    const intervalMs = 1500;
    let elapsed = 0;

    const timer = setInterval(async () => {
      elapsed += intervalMs;
      const { session, csrf } = await getLCCookies();

      if (session && csrf) {
        const isValid = await validateLCCookies(session, csrf);
        if (isValid) {
          clearInterval(timer);
          try {
            await chrome.tabs.remove(tabId);
          } catch {}
          resolve({ session, csrf });
          return;
        }
      }

      if (elapsed >= timeoutMs) {
        clearInterval(timer);
        reject(new Error("Timed out waiting for LeetCode login."));
      }
    }, intervalMs);
  });
}

async function clearLCCookies() {
  await Promise.all([
    chrome.cookies.remove({ url: LC_ORIGIN, name: "LEETCODE_SESSION" }),
    chrome.cookies.remove({ url: LC_ORIGIN, name: "csrftoken" }),
  ]);
}

async function handleFetchTokens(force = false) {
  if (!force) {
    const existing = await getLCCookies();
    if (existing.session && existing.csrf) {
      const isValid = await validateLCCookies(existing.session, existing.csrf);
      if (isValid) {
        return {
          success: true,
          session: existing.session,
          csrf: existing.csrf,
          alreadyLoggedIn: true,
        };
      }
    }
  }

  await clearLCCookies();
  const tab = await chrome.tabs.create({
    url: "https://leetcode.com/accounts/login/",
    active: true,
  });

  try {
    const tokens = await waitForCookies(tab.id);
    return { success: true, ...tokens, alreadyLoggedIn: false };
  } catch (err) {
    try {
      await chrome.tabs.remove(tab.id);
    } catch {}
    return { success: false, error: err.message };
  }
}

async function handleClearTokens() {
  // Keep browser cookies intact. The app clears its own localStorage copy.
  return { success: true };
}

function waitForTabComplete(tabId, timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timeoutId = setTimeout(() => {
      if (settled) return;
      settled = true;
      chrome.tabs.onUpdated.removeListener(onUpdated);
      reject(new Error("Timed out waiting for LeetCode tab to load."));
    }, timeoutMs);

    const onUpdated = (updatedTabId, changeInfo) => {
      if (updatedTabId !== tabId) return;
      if (changeInfo.status === "complete") {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        chrome.tabs.onUpdated.removeListener(onUpdated);
        resolve();
      }
    };

    chrome.tabs.onUpdated.addListener(onUpdated);
    chrome.tabs.get(tabId).then((tab) => {
      if (tab.status === "complete" && !settled) {
        settled = true;
        clearTimeout(timeoutId);
        chrome.tabs.onUpdated.removeListener(onUpdated);
        resolve();
      }
    }).catch(() => {
      // Ignore. Listener/timeout handles failures.
    });
  });
}

async function findLeetCodeTab() {
  const tabs = await chrome.tabs.query({ url: `${LC_ORIGIN}/*` });
  for (const tab of tabs) {
    if (typeof tab.id === "number") return tab.id;
  }
  return null;
}

async function ensureLeetCodeTab() {
  const existingTabId = await findLeetCodeTab();
  if (existingTabId != null) {
    try {
      await waitForTabComplete(existingTabId, 5000);
    } catch {}
    return existingTabId;
  }

  const tab = await chrome.tabs.create({ url: LC_TAB_URL, active: false });
  await waitForTabComplete(tab.id);
  return tab.id;
}

function sendMessageToTab(tabId, message) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(response);
    });
  });
}

async function requestLeetCodeApi(payload) {
  const tabId = await ensureLeetCodeTab();

  try {
    const response = await sendMessageToTab(tabId, {
      type: "LC_EXEC_REQUEST",
      payload,
    });
    return response;
  } catch (error) {
    const msg = String(error);
    if (!msg.includes("Receiving end does not exist")) {
      return { success: false, error: msg };
    }
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"],
    });
    const response = await sendMessageToTab(tabId, {
      type: "LC_EXEC_REQUEST",
      payload,
    });
    return response;
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

async function reinjectContentScriptIntoExistingTabs() {
  const matches = [
    `${LC_ORIGIN}/*`,
    "http://localhost/*",
    "http://127.0.0.1/*",
    "https://*.vercel.app/*",
  ];

  const tabs = await chrome.tabs.query({ url: matches });
  for (const tab of tabs) {
    if (typeof tab.id !== "number") continue;
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"],
      });
    } catch {
      // Ignore tabs where injection is not allowed.
    }
  }
}

chrome.runtime.onInstalled.addListener(() => {
  reinjectContentScriptIntoExistingTabs().catch(() => {});
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "FETCH_LC_TOKENS") {
    handleFetchTokens(message.force)
      .then(sendResponse)
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.type === "CHECK_LC_TOKENS") {
    getLCCookies().then(({ session, csrf }) => {
      sendResponse({
        success: true,
        hasTokens: !!(session && csrf),
        session,
        csrf,
      });
    });
    return true;
  }

  if (message.type === "CLEAR_LC_TOKENS") {
    handleClearTokens()
      .then(sendResponse)
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.type === "REQUEST_LC_API") {
    requestLeetCodeApi(message.payload)
      .then((resp) => sendResponse(resp))
      .catch((err) => sendResponse({ success: false, error: String(err) }));
    return true;
  }
});
