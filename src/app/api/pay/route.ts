// ═══════════════════════════════════════════════════════════
// RugShield — Payment Build API Route
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import type { PaymentBuildRequest, PaymentBuildResponse } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body: PaymentBuildRequest = await request.json();
    const { walletAddress, serviceType, amount, tokenAddress } = body;

    if (!walletAddress || !serviceType || !amount) {
      return NextResponse.json<PaymentBuildResponse>(
        { success: false, error: 'Missing required fields / 缺少必要欄位' },
        { status: 400 }
      );
    }

    // Validate amount
    if (amount <= 0 || amount > 10000) {
      return NextResponse.json<PaymentBuildResponse>(
        { success: false, error: 'Invalid amount (1-10,000 USDC) / 金額無效' },
        { status: 400 }
      );
    }

    // In production, build a pump.fun payment transaction:
    // 1. Create an invoice via pump.fun API
    // 2. Build the transaction using buildAcceptPaymentInstructions
    // 3. Return base64 encoded transaction for client signing

    // For now, generate a mock invoice ID
    const invoiceId = `INV-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`.toUpperCase();

    // Store invoice details (in production, use a database)
    // This would track: walletAddress, serviceType, amount, tokenAddress, status

    return NextResponse.json<PaymentBuildResponse>({
      success: true,
      invoiceId,
      // In production: transaction would be the base64-encoded Solana transaction
      transaction: undefined,
    });
  } catch (error) {
    console.error('Payment build error:', error);
    return NextResponse.json<PaymentBuildResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Payment build failed / 付款建立失敗',
      },
      { status: 500 }
    );
  }
}
