// ═══════════════════════════════════════════════════════════
// RugShield — Radar Alerts API Route
// ═══════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import type { RadarApiResponse } from '@/types';

export async function GET() {
  try {
    // Radar alerts are currently a placeholder
    return NextResponse.json<RadarApiResponse & { placeholder?: true }>({
      success: true,
      alerts: [],
      subscribed: false, // Would check actual subscription status in production
      placeholder: true,
    } as RadarApiResponse);
  } catch (error) {
    console.error('Radar API error:', error);
    return NextResponse.json<RadarApiResponse>(
      {
        success: false,
        alerts: [],
        subscribed: false,
      },
      { status: 500 }
    );
  }
}
