import { NextRequest } from "next/server";

const JUDGE0_BASE_URL =
  process.env.JUDGE0_BASE_URL ?? "https://judge029.p.rapidapi.com";
const JUDGE0_RAPIDAPI_HOST =
  process.env.JUDGE0_RAPIDAPI_HOST ?? "judge029.p.rapidapi.com";
const JUDGE0_RAPIDAPI_KEY = process.env.JUDGE0_RAPIDAPI_KEY;

const FIELDS =
  "stdout,stderr,compile_output,message,status,time,memory,token";

const LANGUAGES: Record<string, number> = {
  javascript: 63,
  python3: 71,
  java: 62,
  cpp: 54,
  typescript: 74,
};

function toB64(text: string): string {
  return Buffer.from(text || "", "utf8").toString("base64");
}

function fromB64(text: string | null | undefined): string | null {
  if (!text) return null;
  try {
    return Buffer.from(text, "base64").toString("utf8");
  } catch {
    return text;
  }
}

interface Judge0FetchResult {
  ok: boolean;
  status: number;
  bodyText: string;
}

async function judge0Fetch(
  path: string,
  init: RequestInit = {},
): Promise<Judge0FetchResult> {
  if (!JUDGE0_RAPIDAPI_KEY) {
    return {
      ok: false,
      status: 500,
      bodyText:
        "Missing JUDGE0_RAPIDAPI_KEY. Add it in .env before running.",
    };
  }

  const res = await fetch(`${JUDGE0_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-rapidapi-host": JUDGE0_RAPIDAPI_HOST,
      "x-rapidapi-key": JUDGE0_RAPIDAPI_KEY,
      ...(init.headers as Record<string, string> | undefined),
    },
  });

  return {
    ok: res.ok,
    status: res.status,
    bodyText: await res.text(),
  };
}

interface Judge0Result {
  stdout?: string | null;
  stderr?: string | null;
  compile_output?: string | null;
  message?: string | null;
  status?: { id: number; description: string };
  time?: string | null;
  memory?: number | null;
  token?: string;
}

async function waitForResult(token: string): Promise<Judge0Result | null> {
  let result: Judge0Result | null = null;

  for (let i = 0; i < 20; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const poll = await judge0Fetch(
      `/submissions/${token}?base64_encoded=true&fields=${FIELDS}`,
    );
    if (!poll.ok) continue;

    result = JSON.parse(poll.bodyText) as Judge0Result;
    if ((result.status?.id ?? 0) > 2) break;
  }

  return result;
}

export async function GET(): Promise<Response> {
  return Response.json({
    languages: LANGUAGES,
    configured: Boolean(JUDGE0_RAPIDAPI_KEY),
  });
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = await request.json();
    const sourceCode: string | undefined = body?.sourceCode;
    const languageId: number | undefined = body?.languageId;
    const stdin: string = body?.stdin ?? "";
    const expectedOutput: string | null = body?.expectedOutput ?? null;

    if (!sourceCode || !languageId) {
      return Response.json(
        { error: "sourceCode and languageId are required." },
        { status: 400 },
      );
    }

    const submissionPayload = {
      source_code: toB64(sourceCode),
      language_id: languageId,
      stdin: toB64(stdin),
      expected_output:
        typeof expectedOutput === "string" ? toB64(expectedOutput) : null,
      cpu_time_limit: body?.cpuTimeLimit ?? 5,
      memory_limit: body?.memoryLimit ?? 128000,
    };

    const waitRes = await judge0Fetch(
      `/submissions?base64_encoded=true&wait=true&fields=${FIELDS}`,
      {
        method: "POST",
        body: JSON.stringify(submissionPayload),
      },
    );

    let result: Judge0Result | null = null;

    if (waitRes.ok) {
      result = JSON.parse(waitRes.bodyText) as Judge0Result;
    } else {
      const createRes = await judge0Fetch(`/submissions?base64_encoded=true`, {
        method: "POST",
        body: JSON.stringify(submissionPayload),
      });

      if (!createRes.ok) {
        return Response.json(
          { error: "Judge0 submission failed.", details: createRes.bodyText },
          { status: createRes.status || 502 },
        );
      }

      const createJson = JSON.parse(createRes.bodyText) as Judge0Result;
      if (!createJson.token) {
        return Response.json(
          { error: "Judge0 did not return a submission token." },
          { status: 502 },
        );
      }

      result = await waitForResult(createJson.token);
      if (!result || (result.status?.id ?? 0) <= 2) {
        return Response.json(
          { error: "Judge0 execution timed out." },
          { status: 504 },
        );
      }
    }

    return Response.json({
      stdout: fromB64(result?.stdout),
      stderr: fromB64(result?.stderr),
      compile_output: fromB64(result?.compile_output),
      message: result?.message,
      status: result?.status,
      time: result?.time,
      memory: result?.memory,
      passed: result?.status?.id === 3,
    });
  } catch (error) {
    return Response.json(
      {
        error: "Failed to execute code with Judge0.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
