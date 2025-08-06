/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextResponse } from "next/server"

// Retrieve Judge0 API configuration from environment variables
const JUDGE0_API_URL = process.env.JUDGE0_SELF_HOSTED_URL ?? "http://192.168.29.77:2358" // Default to user's Judge0 instance if not set

// Helper function to introduce a delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function POST(req: Request) {
  try {
    const { code, language_id, stdin, compiler_options } = await req.json()
    console.log("JUDGE0_API_URL in route:", JUDGE0_API_URL);
    // Prepare the submission body
    const submissionBody: any = {
      source_code: code,
      language_id: language_id,
      stdin: stdin,
      cpu_time_limit: 2, // Set CPU time limit to 2 seconds
      memory_limit: 128000, // Set memory limit to 128 MB (128000 KB)
      redirect_stderr_to_stdout: true, // Redirect stderr to stdout for easier error capture
      base64_encoded: false, // Ensure output is not base64 encoded
    }

    // Add compiler options if provided (e.g., -lm for C math library)
    if (compiler_options) {
      submissionBody.compiler_options = compiler_options
    }

    // 1. Submit the code to Judge0
    const submissionResponse = await fetch(`${JUDGE0_API_URL}/submissions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(submissionBody),
    })

    if (!submissionResponse.ok) {
      const errorData = await submissionResponse.json()
      console.error("Judge0 Submission Error:", errorData)
      return NextResponse.json(
        { error: "Failed to submit code to Judge0", details: errorData },
        { status: submissionResponse.status },
      )
    }

    const { token } = await submissionResponse.json()

    // 2. Poll for the result using the submission token
    let result
    let statusId
    const maxAttempts = 10 // Maximum number of polling attempts
    let attempts = 0

    while (attempts < maxAttempts) {
      await delay(500) // Wait for 500ms before polling again
      const resultResponse = await fetch(`${JUDGE0_API_URL}/submissions/${token}?base64_encoded=false&fields=*`, {
        method: "GET",
        headers: {},
      })

      if (!resultResponse.ok) {
        const errorData = await resultResponse.json()
        console.error("Judge0 Result Fetch Error:", errorData)
        return NextResponse.json(
          { error: "Failed to fetch Judge0 result", details: errorData },
          { status: resultResponse.status },
        )
      }

      result = await resultResponse.json()
      statusId = result.status?.id

      // Judge0 Status IDs:
      // 1: In Queue, 2: Processing
      // 3: Accepted, 4: Wrong Answer, 5: Time Limit Exceeded, 6: Compilation Error, etc.
      // Break loop if status indicates completion (Accepted or any error)
      if (statusId && statusId >= 3) {
        break
      }
      attempts++
    }

    // If polling attempts exceeded, return a timeout error
    if (attempts === maxAttempts) {
      return NextResponse.json({ error: "Judge0 polling timed out." }, { status: 504 })
    }

    // Return the final result from Judge0
    return NextResponse.json(result)
  } catch (error) {
    console.error("API Route Error:", error)
    return NextResponse.json({ error: "Internal server error", details: (error as Error).message }, { status: 500 })
  }
}