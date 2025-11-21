import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { subscription } = body;
    console.info('Received subscription via /api/push/subscribe', subscription ? { endpoint: subscription.endpoint } : null);
    // In production, persist the subscription associated with the user.
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('/api/push/subscribe error', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
