// Clerk webhook removed — Firebase Auth is now the authentication system.
// User sync is handled via /api/auth/sync called client-side after sign-in.
import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ message: "Clerk webhooks are no longer used. See /api/auth/sync." }, { status: 410 });
}
