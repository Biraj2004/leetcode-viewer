/**
 * popup.js - Controls the extension popup UI.
 */

const statusRow = document.getElementById("status-row");
const statusDot = document.getElementById("status-dot");
const statusText = document.getElementById("status-text");
const openLcBtn = document.getElementById("open-lc-btn");
const refreshBtn = document.getElementById("refresh-btn");
const msgEl = document.getElementById("msg");

function setMsg(text, isError = false) {
  msgEl.textContent = text;
  msgEl.className = isError ? "error" : "";
}

function setStatus(loggedIn) {
  if (loggedIn) {
    statusRow.className = "status-row ok";
    statusDot.className = "dot green";
    statusText.textContent = "Logged into LeetCode.";
    setMsg("You can run/submit from the app.");
    return;
  }

  statusRow.className = "status-row bad";
  statusDot.className = "dot red";
  statusText.textContent = "Not logged into LeetCode.";
  setMsg("Please login on leetcode.com in this browser profile.", true);
}

function refreshStatus() {
  refreshBtn.disabled = true;
  setMsg("Checking...");
  chrome.runtime.sendMessage({ type: "CHECK_LC_LOGIN_STATUS" }, (resp) => {
    refreshBtn.disabled = false;
    if (chrome.runtime.lastError) {
      setMsg(`Extension error: ${chrome.runtime.lastError.message}`, true);
      return;
    }
    if (!resp?.success) {
      setMsg(resp?.error ?? "Unable to check login status.", true);
      return;
    }
    setStatus(!!resp.loggedIn);
  });
}

openLcBtn.addEventListener("click", () => {
  chrome.tabs.create({ url: "https://leetcode.com/problemset/" });
});

refreshBtn.addEventListener("click", refreshStatus);
refreshStatus();
