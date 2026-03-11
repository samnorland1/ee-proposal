import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  const correctPassword = process.env.AUTH_PASSWORD?.trim();
  const sessionToken = process.env.AUTH_SECRET?.trim();

  if (!correctPassword || !sessionToken) {
    return NextResponse.json({ error: "Auth not configured" }, { status: 500 });
  }

  if (password.trim() !== correctPassword) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("auth-token", sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("auth-token", "", { maxAge: 0, path: "/" });
  return res;
}
