import { NextResponse } from "next/server";
import pool from "@/lib/db"; // <- this should point to your PostgreSQL pool

export async function POST(req: Request) {
  try {
    const { userId, code, language, result } = await req.json();

    const finalUserId = userId === "anonymous" ? null : userId;

    const query = `
  INSERT INTO submissions (user_id, code, language, result, submitted_at)
  VALUES ($1, $2, $3, $4, NOW())
`;
    await pool.query(query, [finalUserId, code, language, result]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to save submission:", err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
