/**
 * popup.js — Controls the extension popup UI.
 */

const statusRow  = document.getElementById("status-row");
const statusDot  = document.getElementById("status-dot");
const statusText = document.getElementById("status-text");
const fetchBtn   = document.getElementById("fetch-btn");
const clearBtn   = document.getElementById("clear-btn");
const msgEl      = document.getElementById("msg");

function setMsg(text, isError = false) {
  msgEl.textContent = text;
  msgEl.className   = isError ? "error" : "";
}

function setStatus(hasTokens) {
  if (hasTokens) {
    statusRow.className  = "status-row ok";
    statusDot.className  = "dot green";
    statusText.textContent = "Tokens found — you are authenticated!";
  } else {
    statusRow.className  = "status-row bad";
    statusDot.className  = "dot red";
    statusText.textContent = "No tokens found. Please fetch.";
  }
  fetchBtn.disabled = false;
  clearBtn.disabled = !hasTokens;
}

// ── On load: check current token status ──────────────────────────────────────

chrome.runtime.sendMessage({ type: "CHECK_LC_TOKENS" }, (resp) => {
  if (chrome.runtime.lastError) {
    setMsg("Extension error: " + chrome.runtime.lastError.message, true);
    return;
  }
  setStatus(resp.hasTokens);
  if (resp.hasTokens) setMsg("Tokens already present — no login needed.");
});

// ── Fetch button ──────────────────────────────────────────────────────────────

fetchBtn.addEventListener("click", () => {
  fetchBtn.disabled = true;
  clearBtn.disabled = true;
  setMsg("Fetching tokens… (login if prompted)");

  chrome.runtime.sendMessage({ type: "FETCH_LC_TOKENS" }, (resp) => {
    if (chrome.runtime.lastError || !resp) {
      setMsg("Error: " + (chrome.runtime.lastError?.message ?? "Unknown"), true);
      fetchBtn.disabled = false;
      return;
    }

    if (resp.success) {
      setStatus(true);
      setMsg(resp.alreadyLoggedIn
        ? "✓ Already logged in — tokens fetched!"
        : "✓ Login detected — tokens saved!");
    } else {
      setStatus(false);
      setMsg("Failed: " + (resp.error ?? "Unknown error"), true);
      fetchBtn.disabled = false;
    }
  });
});

// ── Clear button ──────────────────────────────────────────────────────────────

clearBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "CLEAR_LC_TOKENS" }, (resp) => {
    if (resp?.success) {
      setStatus(false);
      setMsg("Tokens cleared.");
    } else {
      setMsg("Failed to clear tokens.", true);
    }
  });
});
