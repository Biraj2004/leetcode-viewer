import { NextRequest } from "next/server";

/**
 * /api/leetcode — Server-side proxy for LeetCode Run & Submit
 *
 * All requests go server-side so our real origin is never exposed to LeetCode.
 * We spoof Origin + Referer to match leetcode.com.
 *
 * Body shape:
 *   { mode: "run"|"submit", titleSlug, questionId, lang, typedCode,
 *     dataInput?, leetcodeSession, csrfToken }
 */

const LC_BASE = "https://leetcode.com";
const POLL_INTERVAL_MS = 1500;
const MAX_POLLS = 30; // 45 s max

// LeetCode lang string → our LanguageKey aliases are identical for our 5 langs
// LeetCode status_code → description mapping
const LC_STATUS: Record<number, string> = {
  10: "Accepted",
  11: "Wrong Answer",
  12: "Memory Limit Exceeded",
  13: "Output Limit Exceeded",
  14: "Time Limit Exceeded",
  15: "Runtime Error",
  16: "Internal Error",
  20: "Compile Error",
};

function makeLCHeaders(
  titleSlug: string,
  leetcodeSession: string,
  csrfToken: string,
): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Cookie: `LEETCODE_SESSION=${leetcodeSession}; csrftoken=${csrfToken}`,
    "X-CSRFToken": csrfToken,
    Referer: `${LC_BASE}/problems/${titleSlug}/`,
    Origin: LC_BASE,
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "application/json, text/javascript, */*; q=0.01",
    "Accept-Language": "en-US,en;q=0.9",
    "x-requested-with": "XMLHttpRequest",
  };
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Log every outgoing request to LeetCode (server-side console).
 * Cookie value is truncated to avoid leaking the full session in logs.
 */
function logLCRequest(
  method: string,
  url: string,
  headers: Record<string, string>,
  payload?: unknown,
): void {
  const safeHeaders = {
    ...headers,
    Cookie: headers.Cookie
      ? headers.Cookie.slice(0, 40) + "...[truncated]"
      : undefined,
  };
  console.log(
    `\n[LC API] ${method} ${url}`,
    "\nHeaders:",
    JSON.stringify(safeHeaders, null, 2),
    payload ? `\nPayload: ${JSON.stringify(payload)}` : "",
  );
}

interface LCCheckResult {
  state: string;          // "PENDING" | "STARTED" | "SUCCESS" | "FAILURE"
  status_code?: number;
  status_msg?: string;
  run_success?: boolean;
  compile_error?: string;
  full_compile_error?: string;
  runtime_error?: string;
  last_testcase?: string;
  expected_output?: string;
  code_output?: string;
  std_output?: string;
  total_correct?: number;
  total_testcases?: number;
  runtime_percentile?: number;
  memory_percentile?: number;
  status_runtime?: string;
  status_memory?: string;
  // run-mode fields
  correct_answer?: boolean;
  compare_result?: string;   // "111" = all pass
  task_finish_time?: number;
}

async function pollCheck(
  checkUrl: string,
  headers: Record<string, string>,
): Promise<{ ok: boolean; data: LCCheckResult | null; error?: string }> {
  for (let i = 0; i < MAX_POLLS; i++) {
    await sleep(POLL_INTERVAL_MS);
    try {
      const res = await fetch(checkUrl, { headers });

      if (res.status === 401 || res.status === 403) {
        return { ok: false, data: null, error: "SESSION_EXPIRED" };
      }
      if (res.status === 429) {
        return { ok: false, data: null, error: "RATE_LIMITED" };
      }
      if (!res.ok) {
        return { ok: false, data: null, error: `HTTP ${res.status}` };
      }

      const data = (await res.json()) as LCCheckResult;
      if (data.state === "SUCCESS" || data.state === "FAILURE") {
        return { ok: true, data };
      }
      // PENDING / STARTED — keep polling
    } catch (e) {
      return { ok: false, data: null, error: String(e) };
    }
  }
  return { ok: false, data: null, error: "TIMEOUT" };
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = await request.json();
    const {
      mode,
      titleSlug,
      questionId,
      lang,
      typedCode,
      dataInput,
      leetcodeSession,
      csrfToken,
    } = body as {
      mode: "run" | "submit" | "submission_details";
      titleSlug: string;
      questionId: string;
      lang: string;
      typedCode: string;
      dataInput?: string;
      leetcodeSession: string;
      csrfToken: string;
    };

    // ── Validation ───────────────────────────────────────────────────────────
    if (!leetcodeSession || !csrfToken) {
      return Response.json(
        { error: "MISSING_SESSION", message: "LeetCode session or CSRF token not configured. Please add them in Settings." },
        { status: 401 },
      );
    }
    // For run/submit we also need lang, typedCode, titleSlug, questionId
    if (mode !== "submission_details" && (!titleSlug || !questionId || !lang || !typedCode)) {
      return Response.json(
        { error: "MISSING_FIELDS", message: "Missing required fields." },
        { status: 400 },
      );
    }

    const headers = makeLCHeaders(titleSlug, leetcodeSession, csrfToken);

    // ── Run mode: interpret_solution ─────────────────────────────────────────
    if (mode === "run") {
      const runPayload = {
        lang,
        question_id: questionId,
        typed_code: typedCode,
        data_input: dataInput ?? "",
      };

      const runUrl = `${LC_BASE}/problems/${titleSlug}/interpret_solution/`;
      //logLCRequest("POST", runUrl, headers, runPayload);
      const runRes = await fetch(
        runUrl,
        { method: "POST", headers, body: JSON.stringify(runPayload) },
      );
      //console.log(`[LC API] → interpret_solution response: HTTP ${runRes.status}`);

      if (runRes.status === 401 || runRes.status === 403) {
        return Response.json(
          { error: "SESSION_EXPIRED", message: "Your LeetCode session has expired. Please update it in Settings." },
          { status: 401 },
        );
      }
      if (runRes.status === 429) {
        return Response.json(
          { error: "RATE_LIMITED", message: "LeetCode is rate limiting requests. Please wait a moment and try again." },
          { status: 429 },
        );
      }
      if (!runRes.ok) {
        const text = await runRes.text();
        return Response.json(
          { error: "LC_RUN_FAILED", message: `LeetCode run failed (HTTP ${runRes.status}).`, details: text },
          { status: 502 },
        );
      }

      const runJson = await runRes.json() as { interpret_id?: string };
      if (!runJson.interpret_id) {
        return Response.json(
          { error: "NO_INTERPRET_ID", message: "LeetCode did not return an interpret ID." },
          { status: 502 },
        );
      }

      // Poll for result
      const checkUrl = `${LC_BASE}/submissions/detail/${runJson.interpret_id}/check/`;
      console.log(`[LC API] Polling GET ${checkUrl}`);
      const { ok, data, error } = await pollCheck(checkUrl, headers);

      if (!ok || !data) {
        if (error === "SESSION_EXPIRED") {
          return Response.json(
            { error: "SESSION_EXPIRED", message: "Your LeetCode session has expired. Please update it in Settings." },
            { status: 401 },
          );
        }
        if (error === "RATE_LIMITED") {
          return Response.json(
            { error: "RATE_LIMITED", message: "LeetCode rate limited the request. Please wait and retry." },
            { status: 429 },
          );
        }
        if (error === "TIMEOUT") {
          return Response.json(
            { error: "TIMEOUT", message: "LeetCode took too long to respond. Try again." },
            { status: 504 },
          );
        }
        return Response.json(
          { error: "POLL_FAILED", message: `Polling failed: ${error}` },
          { status: 502 },
        );
      }

      // Build run result — compare_result is "111" if all visible cases pass
      const allPass = data.correct_answer === true;
      const statusCode = allPass ? 10 : (data.status_code ?? 11);
      const statusMsg = LC_STATUS[statusCode] ?? data.status_msg ?? "Unknown";

      return Response.json({
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
      });
    }

    // ── Submit mode ──────────────────────────────────────────────────────────
    if (mode === "submit") {
      const submitPayload = {
        lang,
        question_id: questionId,
        typed_code: typedCode,
      };

      const submitUrl = `${LC_BASE}/problems/${titleSlug}/submit/`;
      //logLCRequest("POST", submitUrl, headers, submitPayload);
      const submitRes = await fetch(
        submitUrl,
        { method: "POST", headers, body: JSON.stringify(submitPayload) },
      );
      //console.log(`[LC API] → submit response: HTTP ${submitRes.status}`);

      if (submitRes.status === 401 || submitRes.status === 403) {
        return Response.json(
          { error: "SESSION_EXPIRED", message: "Your LeetCode session has expired. Please update it in Settings." },
          { status: 401 },
        );
      }
      if (submitRes.status === 429) {
        return Response.json(
          { error: "RATE_LIMITED", message: "LeetCode is rate limiting requests. Please wait a moment and try again." },
          { status: 429 },
        );
      }
      if (!submitRes.ok) {
        const text = await submitRes.text();
        return Response.json(
          { error: "LC_SUBMIT_FAILED", message: `LeetCode submit failed (HTTP ${submitRes.status}).`, details: text },
          { status: 502 },
        );
      }

      const submitJson = await submitRes.json() as { submission_id?: number };
      if (!submitJson.submission_id) {
        return Response.json(
          { error: "NO_SUBMISSION_ID", message: "LeetCode did not return a submission ID." },
          { status: 502 },
        );
      }

      // Poll for result
      const checkUrl = `${LC_BASE}/submissions/detail/${submitJson.submission_id}/check/`;
      console.log(`[LC API] Polling GET ${checkUrl}`);
      const { ok, data, error } = await pollCheck(checkUrl, headers);

      if (!ok || !data) {
        if (error === "SESSION_EXPIRED") {
          return Response.json(
            { error: "SESSION_EXPIRED", message: "Your LeetCode session has expired. Please update it in Settings." },
            { status: 401 },
          );
        }
        if (error === "RATE_LIMITED") {
          return Response.json(
            { error: "RATE_LIMITED", message: "LeetCode rate limited the request. Please wait and retry." },
            { status: 429 },
          );
        }
        if (error === "TIMEOUT") {
          return Response.json(
            { error: "TIMEOUT", message: "LeetCode took too long to respond. Try again." },
            { status: 504 },
          );
        }
        return Response.json(
          { error: "POLL_FAILED", message: `Polling failed: ${error}` },
          { status: 502 },
        );
      }

      const statusCode = data.status_code ?? 11;
      const statusMsg = LC_STATUS[statusCode] ?? data.status_msg ?? "Unknown";

      return Response.json({
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
      });
    }

    // ── Submission details via GraphQL (for SubmissionsTab on-demand loading) ──
    if (mode === "submission_details") {
      const { submissionId } = body as { submissionId: number; leetcodeSession: string; csrfToken: string };
      if (!submissionId) {
        return Response.json({ error: "MISSING_FIELDS", message: "submissionId required." }, { status: 400 });
      }

      const gqlQuery = `query submissionDetails($submissionId: Int!) {
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

      const gqlHeaders = {
        "Content-Type": "application/json",
        Cookie: `LEETCODE_SESSION=${leetcodeSession}; csrftoken=${csrfToken}`,
        "X-CSRFToken": csrfToken,
        Referer: `${LC_BASE}/`,
        Origin: LC_BASE,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "application/json",
      };

      console.log(`[LC API] GraphQL submissionDetails for id=${submissionId}`);

      const gqlRes = await fetch(`${LC_BASE}/graphql/`, {
        method: "POST",
        headers: gqlHeaders,
        body: JSON.stringify({
          query: gqlQuery,
          variables: { submissionId },
          operationName: "submissionDetails",
        }),
      });

      if (gqlRes.status === 401 || gqlRes.status === 403) {
        return Response.json({ error: "SESSION_EXPIRED", message: "LeetCode session expired." }, { status: 401 });
      }
      if (!gqlRes.ok) {
        return Response.json({ error: "GQL_FAILED", message: `GraphQL HTTP ${gqlRes.status}` }, { status: 502 });
      }

      const gqlData = await gqlRes.json() as {
        data?: { submissionDetails?: Record<string, unknown> };
        errors?: unknown[];
      };

      if (gqlData?.errors?.length) {
        console.warn("[LC API] GraphQL errors:", gqlData.errors);
      }

      const sd = gqlData?.data?.submissionDetails;
      if (!sd) {
        return Response.json({ error: "NOT_FOUND", message: "Submission not found." }, { status: 404 });
      }

      // Parse distribution JSON strings
      let runtimeDistribution: Array<[number, number]> | undefined;
      let memoryDistribution: Array<[number, number]> | undefined;
      try {
        const p = JSON.parse(sd.runtimeDistribution as string);
        runtimeDistribution = Array.isArray(p) ? p : (p?.distribution ?? []);
      } catch { /* skip */ }
      try {
        const p = JSON.parse(sd.memoryDistribution as string);
        memoryDistribution = Array.isArray(p) ? p : (p?.distribution ?? []);
      } catch { /* skip */ }

      console.log(`[LC API] submissionDetails → runtime points: ${runtimeDistribution?.length ?? 0}`);

      return Response.json({
        ...sd,
        runtime_distribution: runtimeDistribution,
        memory_distribution: memoryDistribution,
      });
    }

    return Response.json({ error: "INVALID_MODE", message: "mode must be 'run', 'submit', or 'submission_details'." }, { status: 400 });
  } catch (error) {
    return Response.json(
      {
        error: "INTERNAL_ERROR",
        message: "Unexpected server error.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
