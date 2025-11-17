import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const headers = Object.fromEntries(req.headers.entries());
    const env = {
      NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? null,
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? 'SET' : 'NOT SET',
      NEXTAUTH_TRUST_HOST: process.env.NEXTAUTH_TRUST_HOST ?? null,
    };

    return NextResponse.json({ headers, env });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
