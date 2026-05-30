/**
 * content.js — Injected into leetcode.com and our client app domains.
 *
 * Provides a clean window-postMessage interface between the page and extension background.
 */

if (window.location.hostname.includes("leetcode.com")) {
  console.debug("[LV-ext] Content script active on leetcode.com");
} else {
  console.debug("[LV-ext] Content script active on client page:", window.location.origin);

  // Listen for messages FROM the page (our React app)
  window.addEventListener("message", (event) => {
    // Only accept messages from the same page
    if (event.source !== window) return;

    const message = event.data;
    if (!message || typeof message !== "object") return;

    // Ping check to detect extension presence
    if (message.type === "LV_EXT_PING") {
      window.postMessage({ type: "LV_EXT_PONG" }, "*");
      return;
    }

    // Proxy request: check current token status
    if (message.type === "LV_EXT_REQ_CHECK") {
      try {
        chrome.runtime.sendMessage({ type: "CHECK_LC_TOKENS" }, (resp) => {
          if (chrome.runtime.lastError) {
            window.postMessage({ type: "LV_EXT_RESP_CHECK", error: chrome.runtime.lastError.message }, "*");
          } else {
            window.postMessage({ type: "LV_EXT_RESP_CHECK", data: resp }, "*");
          }
        });
      } catch (err) {
        window.postMessage({ type: "LV_EXT_RESP_CHECK", error: err.message }, "*");
      }
      return;
    }

    // Proxy request: fetch new tokens
    if (message.type === "LV_EXT_REQ_FETCH") {
      try {
        chrome.runtime.sendMessage({ type: "FETCH_LC_TOKENS", force: message.force }, (resp) => {
          if (chrome.runtime.lastError) {
            window.postMessage({ type: "LV_EXT_RESP_FETCH", error: chrome.runtime.lastError.message }, "*");
          } else {
            window.postMessage({ type: "LV_EXT_RESP_FETCH", data: resp }, "*");
          }
        });
      } catch (err) {
        window.postMessage({ type: "LV_EXT_RESP_FETCH", error: err.message }, "*");
      }
      return;
    }

    // Proxy request: clear tokens
    if (message.type === "LV_EXT_REQ_CLEAR") {
      try {
        chrome.runtime.sendMessage({ type: "CLEAR_LC_TOKENS" }, (resp) => {
          if (chrome.runtime.lastError) {
            window.postMessage({ type: "LV_EXT_RESP_CLEAR", error: chrome.runtime.lastError.message }, "*");
          } else {
            window.postMessage({ type: "LV_EXT_RESP_CLEAR", data: resp }, "*");
          }
        });
      } catch (err) {
        window.postMessage({ type: "LV_EXT_RESP_CLEAR", error: err.message }, "*");
      }
      return;
    }
  });
}
