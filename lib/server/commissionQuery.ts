import "server-only";

import { NextResponse, type NextRequest } from "next/server";

import { isValidDateString } from "./availability";

/** Parse the optional `from`/`to` (YYYY-MM-DD) query params; a bad value is a 400. */
export function parseRange(request: NextRequest): { from: string | null; to: string | null } | { error: NextResponse } {
  const q = request.nextUrl.searchParams;
  const from = q.get("from") || null;
  const to = q.get("to") || null;
  for (const v of [from, to]) {
    if (v && !isValidDateString(v)) {
      return { error: NextResponse.json({ success: false, message: "Invalid date. Expected YYYY-MM-DD." }, { status: 400 }) };
    }
  }
  if (from && to && from > to) {
    return { error: NextResponse.json({ success: false, message: "The start date is after the end date." }, { status: 400 }) };
  }
  return { from, to };
}
