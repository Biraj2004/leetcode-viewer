/**
 * content.js
 *
 * - On app pages (localhost / vercel): bridges window.postMessage <-> extension runtime messaging.
 * - On leetcode.com: executes run/submit/submission-details requests in real browser context.
 */

const LC_BASE = "https://leetcode.com";
const POLL_INTERVAL_MS = 1500;
const MAX_POLLS = 30;

const LC_STATUS = {
  10: "Accepted",
  11: "Wrong Answer",
  12: "Memory Limit Exceeded",
  13: "Output Limit Exceeded",
  14: "Time Limit Exceeded",
  15: "Runtime Error",
  16: "Internal Error",
  20: "Compile Error",
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getCookieValue(name) {
  const key = `${name}=`;
  const parts = document.cookie.split(";");
  for (const partRaw of parts) {
    const part = partRaw.trim();
    if (part.startsWith(key)) return part.slice(key.length);
  }
  return "";
}

function getLCCredentialsFromBackground() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "CHECK_LC_TOKENS" }, (resp) => {
      if (chrome.runtime.lastError) {
        resolve({ session: "", csrf: "" });
        return;
      }
      resolve({
        session: resp?.session ?? "",
        csrf: resp?.csrf ?? "",
      });
    });
  });
}

function makeLcHeaders(titleSlug, csrfToken) {
  return {
    "content-type": "application/json",
    "x-csrftoken": csrfToken,
    "x-requested-with": "XMLHttpRequest",
    referer: `${LC_BASE}/problems/${titleSlug}/`,
    origin: LC_BASE,
    accept: "application/json, text/javascript, */*; q=0.01",
  };
}

async function pollCheck(checkUrl, headers) {
  for (let i = 0; i < MAX_POLLS; i++) {
    await sleep(POLL_INTERVAL_MS);
    const res = await fetch(checkUrl, {
      method: "GET",
      credentials: "include",
      headers,
    });

    if (res.status === 401 || res.status === 403) {
      return { ok: false, error: "SESSION_EXPIRED" };
    }
    if (res.status === 429) {
      return { ok: false, error: "RATE_LIMITED" };
    }
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}` };
    }

    const data = await res.json();
    if (data.state === "SUCCESS" || data.state === "FAILURE") {
      return { ok: true, data };
    }
  }
  return { ok: false, error: "TIMEOUT" };
}

async function executeRun(payload) {
  const { titleSlug, questionId, lang, typedCode, dataInput } = payload;
  const creds = await getLCCredentialsFromBackground();
  const csrfToken = creds.csrf || getCookieValue("csrftoken");

  if (!creds.session || !csrfToken) {
    return {
      success: false,
      status: 401,
      error: "MISSING_SESSION",
      message: "LeetCode session missing. Please login on leetcode.com.",
    };
  }

  const headers = makeLcHeaders(titleSlug, csrfToken);
  const runPayload = {
    lang,
    question_id: questionId,
    typed_code: typedCode,
    data_input: dataInput ?? "",
  };

  const runUrl = `${LC_BASE}/problems/${titleSlug}/interpret_solution/`;
  const runRes = await fetch(runUrl, {
    method: "POST",
    credentials: "include",
    headers,
    body: JSON.stringify(runPayload),
  });

  if (runRes.status === 401 || runRes.status === 403) {
    return {
      success: false,
      status: 401,
      error: "SESSION_EXPIRED",
      message: "LeetCode session expired. Please login again.",
    };
  }
  if (runRes.status === 429) {
    return {
      success: false,
      status: 429,
      error: "RATE_LIMITED",
      message: "LeetCode is rate limiting requests. Please retry shortly.",
    };
  }
  if (!runRes.ok) {
    return {
      success: false,
      status: 502,
      error: "LC_RUN_FAILED",
      message: `LeetCode run failed (HTTP ${runRes.status}).`,
      details: await runRes.text(),
    };
  }

  const runJson = await runRes.json();
  if (!runJson.interpret_id) {
    return {
      success: false,
      status: 502,
      error: "NO_INTERPRET_ID",
      message: "LeetCode did not return an interpret ID.",
    };
  }

  const checkUrl = `${LC_BASE}/submissions/detail/${runJson.interpret_id}/check/`;
  const poll = await pollCheck(checkUrl, headers);
  if (!poll.ok || !poll.data) {
    const pollError = poll.error || "POLL_FAILED";
    const status = pollError === "SESSION_EXPIRED" ? 401
      : pollError === "RATE_LIMITED" ? 429
      : pollError === "TIMEOUT" ? 504
      : 502;
    const message = pollError === "SESSION_EXPIRED" ? "LeetCode session expired. Please login again."
      : pollError === "RATE_LIMITED" ? "LeetCode rate limited the request. Please retry."
      : pollError === "TIMEOUT" ? "LeetCode took too long to respond. Try again."
      : `Polling failed: ${pollError}`;
    return { success: false, status, error: pollError, message };
  }

  const data = poll.data;
  const allPass = data.correct_answer === true;
  const statusCode = allPass ? 10 : (data.status_code ?? 11);
  const statusMsg = LC_STATUS[statusCode] ?? data.status_msg ?? "Unknown";

  return {
    success: true,
    payload: {
      provider: "leetcode",
      mode: "run",
      status: { id: statusCode, description: statusMsg },
      run_success: data.run_success,
      correct_answer: data.correct_answer,
      compare_result: data.compare_result,
      std_output: data.std_output,
      code_output: data.code_output,
      expected_output: data.expected_output,
      last_testcase: data.last_testcase,
      compile_error: data.compile_error,
      full_compile_error: data.full_compile_error,
      runtime_error: data.runtime_error,
      status_runtime: data.status_runtime,
      status_memory: data.status_memory,
      total_correct: data.total_correct,
      total_testcases: data.total_testcases,
    },
  };
}

async function executeSubmit(payload) {
  const { titleSlug, questionId, lang, typedCode } = payload;
  const creds = await getLCCredentialsFromBackground();
  const csrfToken = creds.csrf || getCookieValue("csrftoken");

  if (!creds.session || !csrfToken) {
    return {
      success: false,
      status: 401,
      error: "MISSING_SESSION",
      message: "LeetCode session missing. Please login on leetcode.com.",
    };
  }

  const headers = makeLcHeaders(titleSlug, csrfToken);
  const submitPayload = {
    lang,
    question_id: questionId,
    typed_code: typedCode,
  };
  const submitUrl = `${LC_BASE}/problems/${titleSlug}/submit/`;
  const submitRes = await fetch(submitUrl, {
    method: "POST",
    credentials: "include",
    headers,
    body: JSON.stringify(submitPayload),
  });

  if (submitRes.status === 401 || submitRes.status === 403) {
    return {
      success: false,
      status: 401,
      error: "SESSION_EXPIRED",
      message: "LeetCode session expired. Please login again.",
    };
  }
  if (submitRes.status === 429) {
    return {
      success: false,
      status: 429,
      error: "RATE_LIMITED",
      message: "LeetCode is rate limiting requests. Please retry shortly.",
    };
  }
  if (!submitRes.ok) {
    return {
      success: false,
      status: 502,
      error: "LC_SUBMIT_FAILED",
      message: `LeetCode submit failed (HTTP ${submitRes.status}).`,
      details: await submitRes.text(),
    };
  }

  const submitJson = await submitRes.json();
  if (!submitJson.submission_id) {
    return {
      success: false,
      status: 502,
      error: "NO_SUBMISSION_ID",
      message: "LeetCode did not return a submission ID.",
    };
  }

  const checkUrl = `${LC_BASE}/submissions/detail/${submitJson.submission_id}/check/`;
  const poll = await pollCheck(checkUrl, headers);
  if (!poll.ok || !poll.data) {
    const pollError = poll.error || "POLL_FAILED";
    const status = pollError === "SESSION_EXPIRED" ? 401
      : pollError === "RATE_LIMITED" ? 429
      : pollError === "TIMEOUT" ? 504
      : 502;
    const message = pollError === "SESSION_EXPIRED" ? "LeetCode session expired. Please login again."
      : pollError === "RATE_LIMITED" ? "LeetCode rate limited the request. Please retry."
      : pollError === "TIMEOUT" ? "LeetCode took too long to respond. Try again."
      : `Polling failed: ${pollError}`;
    return { success: false, status, error: pollError, message };
  }

  const data = poll.data;
  const statusCode = data.status_code ?? 11;
  const statusMsg = LC_STATUS[statusCode] ?? data.status_msg ?? "Unknown";

  return {
    success: true,
    payload: {
      provider: "leetcode",
      mode: "submit",
      status: { id: statusCode, description: statusMsg },
      submission_id: submitJson.submission_id,
      run_success: data.run_success,
      total_correct: data.total_correct,
      total_testcases: data.total_testcases,
      runtime_percentile: data.runtime_percentile,
      memory_percentile: data.memory_percentile,
      status_runtime: data.status_runtime,
      status_memory: data.status_memory,
      last_testcase: data.last_testcase,
      expected_output: data.expected_output,
      code_output: data.code_output,
      std_output: data.std_output,
      compile_error: data.compile_error,
      full_compile_error: data.full_compile_error,
      runtime_error: data.runtime_error,
    },
  };
}

async function executeSubmissionDetails(payload) {
  const { submissionId } = payload;
  const creds = await getLCCredentialsFromBackground();
  const csrfToken = creds.csrf || getCookieValue("csrftoken");
  if (!creds.session || !csrfToken) {
    return {
      success: false,
      status: 401,
      error: "MISSING_SESSION",
      message: "LeetCode session missing. Please login on leetcode.com.",
    };
  }
  if (!submissionId) {
    return {
      success: false,
      status: 400,
      error: "MISSING_FIELDS",
      message: "submissionId required.",
    };
  }

  const query = `query submissionDetails($submissionId: Int!) {
    submissionDetails(submissionId: $submissionId) {
      runtime
      runtimeDisplay
      runtimePercentile
      runtimeDistribution
      memory
      memoryDisplay
      memoryPercentile
      memoryDistribution
      code
      timestamp
      statusCode
      lang { name verboseName }
      question { questionId titleSlug }
      notes
      runtimeError
      compileError
      lastTestcase
      codeOutput
      expectedOutput
      totalCorrect
      totalTestcases
      stdOutput
    }
  }`;

  const gqlRes = await fetch(`${LC_BASE}/graphql/`, {
    method: "POST",
    credentials: "include",
    headers: {
      "content-type": "application/json",
      "x-csrftoken": csrfToken,
      origin: LC_BASE,
      referer: `${LC_BASE}/`,
      accept: "application/json",
    },
    body: JSON.stringify({
      query,
      variables: { submissionId },
      operationName: "submissionDetails",
    }),
  });

  if (gqlRes.status === 401 || gqlRes.status === 403) {
    return {
      success: false,
      status: 401,
      error: "SESSION_EXPIRED",
      message: "LeetCode session expired. Please login again.",
    };
  }
  if (!gqlRes.ok) {
    return {
      success: false,
      status: 502,
      error: "GQL_FAILED",
      message: `GraphQL HTTP ${gqlRes.status}`,
    };
  }

  const gqlData = await gqlRes.json();
  const sd = gqlData?.data?.submissionDetails;
  if (!sd) {
    return {
      success: false,
      status: 404,
      error: "NOT_FOUND",
      message: "Submission not found.",
    };
  }

  let runtimeDistribution;
  let memoryDistribution;
  try {
    const parsed = JSON.parse(sd.runtimeDistribution);
    runtimeDistribution = Array.isArray(parsed)
      ? parsed
      : (parsed?.distribution ?? []);
  } catch {}
  try {
    const parsed = JSON.parse(sd.memoryDistribution);
    memoryDistribution = Array.isArray(parsed)
      ? parsed
      : (parsed?.distribution ?? []);
  } catch {}

  return {
    success: true,
    payload: {
      ...sd,
      runtime_distribution: runtimeDistribution,
      memory_distribution: memoryDistribution,
    },
  };
}

async function executeLeetCodeRequest(payload) {
  const mode = payload?.mode;
  if (mode === "run") return executeRun(payload);
  if (mode === "submit") return executeSubmit(payload);
  if (mode === "submission_details") return executeSubmissionDetails(payload);
  return {
    success: false,
    status: 400,
    error: "INVALID_MODE",
    message: "mode must be 'run', 'submit', or 'submission_details'.",
  };
}

function handleAppPageBridge() {
  if (window.__LV_EXT_BRIDGE_INIT__) return;
  window.__LV_EXT_BRIDGE_INIT__ = true;

  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    const message = event.data;
    if (!message || typeof message !== "object") return;

    if (message.type === "LV_EXT_PING") {
      window.postMessage({ type: "LV_EXT_PONG" }, "*");
      return;
    }

    if (message.type === "LV_EXT_REQ_CHECK") {
      chrome.runtime.sendMessage({ type: "CHECK_LC_TOKENS" }, (resp) => {
        if (chrome.runtime.lastError) {
          window.postMessage({
            type: "LV_EXT_RESP_CHECK",
            error: chrome.runtime.lastError.message,
          }, "*");
          return;
        }
        window.postMessage({ type: "LV_EXT_RESP_CHECK", data: resp }, "*");
      });
      return;
    }

    if (message.type === "LV_EXT_REQ_FETCH") {
      chrome.runtime.sendMessage({
        type: "FETCH_LC_TOKENS",
        force: message.force,
      }, (resp) => {
        if (chrome.runtime.lastError) {
          window.postMessage({
            type: "LV_EXT_RESP_FETCH",
            error: chrome.runtime.lastError.message,
          }, "*");
          return;
        }
        window.postMessage({ type: "LV_EXT_RESP_FETCH", data: resp }, "*");
      });
      return;
    }

    if (message.type === "LV_EXT_REQ_CLEAR") {
      chrome.runtime.sendMessage({ type: "CLEAR_LC_TOKENS" }, (resp) => {
        if (chrome.runtime.lastError) {
          window.postMessage({
            type: "LV_EXT_RESP_CLEAR",
            error: chrome.runtime.lastError.message,
          }, "*");
          return;
        }
        window.postMessage({ type: "LV_EXT_RESP_CLEAR", data: resp }, "*");
      });
      return;
    }

    if (message.type === "LV_EXT_REQ_LC_API") {
      chrome.runtime.sendMessage({
        type: "REQUEST_LC_API",
        payload: message.payload,
      }, (resp) => {
        if (chrome.runtime.lastError) {
          window.postMessage({
            type: "LV_EXT_RESP_LC_API",
            requestId: message.requestId,
            error: chrome.runtime.lastError.message,
          }, "*");
          return;
        }
        window.postMessage({
          type: "LV_EXT_RESP_LC_API",
          requestId: message.requestId,
          data: resp,
        }, "*");
      });
    }
  });
}

function handleLeetCodePage() {
  if (globalThis.__LV_EXT_LC_EXEC_INIT__) return;
  globalThis.__LV_EXT_LC_EXEC_INIT__ = true;

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== "LC_EXEC_REQUEST") return;
    executeLeetCodeRequest(message.payload)
      .then(sendResponse)
      .catch((error) => {
        sendResponse({
          success: false,
          status: 500,
          error: "INTERNAL_ERROR",
          message: error instanceof Error ? error.message : String(error),
        });
      });
    return true;
  });
}

if (window.location.hostname.includes("leetcode.com")) {
  handleLeetCodePage();
} else {
  handleAppPageBridge();
}
