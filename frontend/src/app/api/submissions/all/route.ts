import pool  from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET() {
  const res = await pool.query("SELECT * FROM submissions ORDER BY submitted_at DESC")
  return NextResponse.json(res.rows)
}
