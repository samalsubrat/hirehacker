/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextResponse } from "next/server";

// Retrieve Judge0 API configuration from environment variables
const JUDGE0_API_URL = process.env.JUDGE0_API_URL;

// Fail early if the env variable is not set
if (!JUDGE0_API_URL) {
  throw new Error("JUDGE0_API_URL is not defined in environment variables");
}

// Helper function to introduce a delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(req: Request) {
  try {
    console.log("JUDGE0_API_URL in route:", JUDGE0_API_URL);

    const { code, language_id, stdin, compiler_options } = await req.json();

    // Prepare the submission body
    const submissionBody: any = {
      source_code: code,
      language_id,
      stdin,
      cpu_time_limit: 2, // 2 seconds CPU limit
      memory_limit: 128000, // 128 MB
      redirect_stderr_to_stdout: true,
      base64_encoded: false,
    };

    if (compiler_options) {
      submissionBody.compiler_options = compiler_options;
    }

    // 1. Submit code to Judge0
    const submissionResponse = await fetch(`${JUDGE0_API_URL}/submissions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(submissionBody),
    });

    if (!submissionResponse.ok) {
      const errorData = await submissionResponse.json();
      console.error("Judge0 Submission Error:", errorData);
      return NextResponse.json(
        { error: "Failed to submit code to Judge0", details: errorData },
        { status: submissionResponse.status }
      );
    }

    const { token } = await submissionResponse.json();

    // 2. Poll for the result using the token
    let result;
    let statusId;
    const maxAttempts = 10;
    let attempts = 0;

    while (attempts < maxAttempts) {
      await delay(500);
      const resultResponse = await fetch(`${JUDGE0_API_URL}/submissions/${token}?base64_encoded=false&fields=*`, {
        method: "GET",
      });

      if (!resultResponse.ok) {
        const errorData = await resultResponse.json();
        console.error("Judge0 Result Fetch Error:", errorData);
        return NextResponse.json(
          { error: "Failed to fetch Judge0 result", details: errorData },
          { status: resultResponse.status }
        );
      }

      result = await resultResponse.json();
      statusId = result.status?.id;

      if (statusId && statusId >= 3) {
        break;
      }

      attempts++;
    }

    if (attempts === maxAttempts) {
      return NextResponse.json({ error: "Judge0 polling timed out." }, { status: 504 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("API Route Error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: (error as Error).message },
      { status: 500 }
    );
  }
}
