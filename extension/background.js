/**
 * background.js - Service Worker (Manifest V3)
 *
 * Responsibilities:
 * - Check LeetCode login status for the app settings flow
 * - Route LeetCode judge calls through a real leetcode.com tab
 * - Re-inject content.js into already-open matching tabs after install/update
 */

const LC_ORIGIN = "https://leetcode.com";
const LC_TAB_URL = "https://leetcode.com/problemset/";
const LC_LOGIN_URL = "https://leetcode.com/accounts/login/";
const CSRF_REFRESH_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const APP_ACTIVE_WINDOW_MS = 90 * 1000; // App considered active if heartbeat within 90s
const LOGIN_WAIT_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes
const LOGIN_POLL_INTERVAL_MS = 1500;
const STORAGE_KEYS = {
  lastCsrfRefreshAt: "lv_last_csrf_refresh_at",
  lastAppHeartbeatAt: "lv_last_app_heartbeat_at",
};

let csrfRefreshInFlight = false;

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
        Cookie: `LEETCODE_SESSION=${session}; csrftoken=${csrf}`,
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

async function getAppRefreshState() {
  const state = await chrome.storage.local.get([
    STORAGE_KEYS.lastCsrfRefreshAt,
    STORAGE_KEYS.lastAppHeartbeatAt,
  ]);
  return {
    lastCsrfRefreshAt: Number(state[STORAGE_KEYS.lastCsrfRefreshAt] ?? 0),
    lastAppHeartbeatAt: Number(state[STORAGE_KEYS.lastAppHeartbeatAt] ?? 0),
  };
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

function isMissingReceivingEndError(error) {
  return String(error).includes("Receiving end does not exist");
}

async function requestLeetCodeApiInTab(tabId, payload) {
  try {
    const response = await sendMessageToTab(tabId, {
      type: "LC_EXEC_REQUEST",
      payload,
    });
    return response;
  } catch (error) {
    if (!isMissingReceivingEndError(error)) {
      return { success: false, error: String(error) };
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

async function requestLeetCodeApi(payload) {
  const tabId = await ensureLeetCodeTab();
  return requestLeetCodeApiInTab(tabId, payload);
}

async function waitForLoginCompletion(timeoutMs = LOGIN_WAIT_TIMEOUT_MS) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const { session, csrf } = await getLCCookies();
    if (session && csrf) {
      const valid = await validateLCCookies(session, csrf);
      if (valid) return true;
    }
    await new Promise((resolve) => setTimeout(resolve, LOGIN_POLL_INTERVAL_MS));
  }

  return false;
}

async function ensureLeetCodeLogin() {
  const currentStatus = await checkLoginStatus();
  if (currentStatus.loggedIn) {
    return { success: true, alreadyLoggedIn: true, openedLogin: false };
  }

  let tabId = await findLeetCodeTab();
  let createdTab = false;

  if (tabId == null) {
    const tab = await chrome.tabs.create({ url: LC_LOGIN_URL, active: true });
    if (typeof tab.id !== "number") {
      return { success: false, error: "TAB_CREATE_FAILED", message: "Unable to open LeetCode login tab." };
    }
    tabId = tab.id;
    createdTab = true;
  } else {
    await chrome.tabs.update(tabId, { url: LC_LOGIN_URL, active: true });
  }

  try {
    await waitForTabComplete(tabId, 20000).catch(() => {});
    const loggedIn = await waitForLoginCompletion();
    if (!loggedIn) {
      return {
        success: false,
        error: "LOGIN_TIMEOUT",
        message: "Login not detected in time. Please complete login on leetcode.com and try again.",
      };
    }

    const { lastCsrfRefreshAt } = await getAppRefreshState();
    return {
      success: true,
      loggedIn: true,
      openedLogin: true,
      createdTab,
      lastCsrfRefreshAt,
    };
  } finally {
    if (createdTab && typeof tabId === "number") {
      try {
        await chrome.tabs.remove(tabId);
      } catch {}
    }
  }
}

async function checkLoginStatus() {
  const { session, csrf } = await getLCCookies();
  const hasTokens = !!(session && csrf);
  let loggedIn = false;

  if (hasTokens) {
    loggedIn = await validateLCCookies(session, csrf);
  }

  const { lastCsrfRefreshAt } = await getAppRefreshState();
  return { success: true, hasTokens, loggedIn, lastCsrfRefreshAt };
}

async function maybeRefreshCsrfSession(reason = "heartbeat") {
  if (csrfRefreshInFlight) {
    return { success: true, skipped: "IN_FLIGHT" };
  }

  const now = Date.now();
  const { lastCsrfRefreshAt, lastAppHeartbeatAt } = await getAppRefreshState();
  const appActive = now - lastAppHeartbeatAt <= APP_ACTIVE_WINDOW_MS;

  if (!appActive) {
    return { success: true, skipped: "APP_INACTIVE" };
  }

  if (now - lastCsrfRefreshAt < CSRF_REFRESH_INTERVAL_MS) {
    return {
      success: true,
      skipped: "NOT_DUE",
      nextDueAt: lastCsrfRefreshAt + CSRF_REFRESH_INTERVAL_MS,
    };
  }

  const { session, csrf } = await getLCCookies();
  if (!session || !csrf) {
    return { success: false, error: "NOT_LOGGED_IN", message: "Please login on leetcode.com." };
  }

  if (!lastCsrfRefreshAt) {
    await chrome.storage.local.set({
      [STORAGE_KEYS.lastCsrfRefreshAt]: now,
    });
    return {
      success: true,
      skipped: "BASELINED",
      nextDueAt: now + CSRF_REFRESH_INTERVAL_MS,
    };
  }

  csrfRefreshInFlight = true;
  let tabId;
  try {
    const tab = await chrome.tabs.create({ url: LC_TAB_URL, active: false });
    if (typeof tab.id !== "number") {
      return { success: false, error: "TAB_CREATE_FAILED", message: "Unable to create refresh tab." };
    }
    tabId = tab.id;
    await waitForTabComplete(tabId, 20000);

    const refreshResp = await requestLeetCodeApiInTab(tabId, { mode: "refresh_csrf" });
    if (!refreshResp?.success) {
      return refreshResp ?? {
        success: false,
        error: "CSRF_REFRESH_FAILED",
        message: "Failed to refresh CSRF token.",
      };
    }

    await chrome.storage.local.set({
      [STORAGE_KEYS.lastCsrfRefreshAt]: Date.now(),
    });

    return {
      success: true,
      refreshed: true,
      reason,
      refreshedAt: Date.now(),
      rotated: !!refreshResp?.payload?.rotated,
    };
  } catch (error) {
    return { success: false, error: "CSRF_REFRESH_FAILED", message: String(error) };
  } finally {
    csrfRefreshInFlight = false;
    if (typeof tabId === "number") {
      try {
        await chrome.tabs.remove(tabId);
      } catch {}
    }
  }
}

async function handleAppHeartbeat(pageUrl) {
  await chrome.storage.local.set({
    [STORAGE_KEYS.lastAppHeartbeatAt]: Date.now(),
  });
  const refresh = await maybeRefreshCsrfSession("heartbeat");
  return { success: true, pageUrl, refresh };
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
  if (message.type === "CHECK_LC_LOGIN_STATUS") {
    checkLoginStatus()
      .then(sendResponse)
      .catch((err) => sendResponse({ success: false, error: String(err) }));
    return true;
  }

  if (message.type === "REQUEST_LC_API") {
    requestLeetCodeApi(message.payload)
      .then((resp) => sendResponse(resp))
      .catch((err) => sendResponse({ success: false, error: String(err) }));
    return true;
  }

  if (message.type === "ENSURE_LC_LOGIN") {
    ensureLeetCodeLogin()
      .then(sendResponse)
      .catch((err) => sendResponse({ success: false, error: String(err) }));
    return true;
  }

  if (message.type === "APP_HEARTBEAT") {
    handleAppHeartbeat(message.url ?? "")
      .then(sendResponse)
      .catch((err) => sendResponse({ success: false, error: String(err) }));
    return true;
  }
});
