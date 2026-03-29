import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ message: "Strategic War Game API" });
}
