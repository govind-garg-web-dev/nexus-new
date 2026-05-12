// Judge0 CE — free public instance, no API key required for dev/testing
// For production, get a key at rapidapi.com/judge0-official/api/judge0-ce
const JUDGE0_BASE = "https://ce.judge0.com";

export const LANGUAGE_IDS: Record<string, number> = {
  python:     71,  // Python 3.8.1
  javascript: 63,  // Node.js 12.14.0
  java:       62,  // OpenJDK 13.0.1
  cpp:        54,  // GCC 9.2.0
  c:          50,  // GCC 9.2.0
  typescript: 74,  // TypeScript 3.7.4
};

export const LANGUAGE_LABELS: Record<string, string> = {
  python:     "Python 3",
  javascript: "JavaScript (Node.js)",
  java:       "Java",
  cpp:        "C++",
  c:          "C",
  typescript: "TypeScript",
};

export type TestCase = {
  input:    string;
  expected: string;
  hidden:   boolean;
};

export type TestResult = {
  passed:   boolean;
  hidden:   boolean;
  status:   string;
  stdout:   string | null;
  stderr:   string | null;
  time:     string | null;
  memory:   number | null;
  expected: string;
};

function b64(str: string) {
  return Buffer.from(str).toString("base64");
}
function fromB64(str: string | null) {
  if (!str) return null;
  return Buffer.from(str, "base64").toString("utf-8").trim();
}

async function submitOne(
  code: string,
  languageId: number,
  input: string,
  expectedOutput: string
): Promise<TestResult & { statusId: number }> {
  const body = {
    source_code:     b64(code),
    language_id:     languageId,
    stdin:           b64(input),
    expected_output: b64(expectedOutput),
    base64_encoded:  true,
    wait:            false,
  };

  // Submit
  const submitRes = await fetch(`${JUDGE0_BASE}/submissions?base64_encoded=true`, {
    method:  "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body:    JSON.stringify(body),
  });

  if (!submitRes.ok) {
    throw new Error(`Judge0 submit failed: ${submitRes.status}`);
  }

  const { token } = await submitRes.json();

  // Poll until done (max 10s)
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 500));

    const pollRes = await fetch(
      `${JUDGE0_BASE}/submissions/${token}?base64_encoded=true&fields=status,stdout,stderr,time,memory`,
      { headers: { Accept: "application/json" } }
    );

    const data = await pollRes.json();
    const statusId: number = data.status?.id ?? 0;

    // Still processing
    if (statusId === 1 || statusId === 2) continue;

    const stdout = fromB64(data.stdout);
    const stderr = fromB64(data.stderr);
    const passed = statusId === 3; // 3 = Accepted

    return {
      passed,
      hidden:   false, // caller sets this
      status:   data.status?.description ?? "Unknown",
      statusId,
      stdout,
      stderr,
      time:     data.time ?? null,
      memory:   data.memory ?? null,
      expected: expectedOutput,
    };
  }

  throw new Error("Judge0 timed out after 10s");
}

export async function runTestCases(
  code: string,
  languageId: number,
  testCases: TestCase[]
): Promise<{ results: TestResult[]; allPassed: boolean; visiblePassed: boolean }> {
  const results: TestResult[] = [];

  for (const tc of testCases) {
    const result = await submitOne(code, languageId, tc.input, tc.expected);
    results.push({ ...result, hidden: tc.hidden });
  }

  const allPassed     = results.every((r) => r.passed);
  const visiblePassed = results.filter((r) => !r.hidden).every((r) => r.passed);

  return { results, allPassed, visiblePassed };
}
