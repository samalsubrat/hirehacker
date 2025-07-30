/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { questionIndex, language, code, testResults, isCorrect } = await req.json();

    const result = await pool.query(
      `INSERT INTO submissions (question_index, language, source_code, test_results, is_correct)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [questionIndex, language, code, testResults, isCorrect]
    );

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (err: any) {
    console.error("Error saving submission:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const questionIndex = req.nextUrl.searchParams.get("questionIndex");

  try {
    const result = await pool.query(
      questionIndex
        ? `SELECT * FROM submissions WHERE question_index = $1 ORDER BY created_at DESC`
        : `SELECT * FROM submissions ORDER BY created_at DESC`,
      questionIndex ? [questionIndex] : []
    );

    return NextResponse.json({ success: true, data: result.rows });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
