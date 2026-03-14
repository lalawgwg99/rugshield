// ═══════════════════════════════════════════════════════════
// RugShield — Payment Verification API Route
// ═══════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import type { PaymentVerifyRequest, PaymentVerifyResponse } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body: PaymentVerifyRequest = await request.json();
    const { walletAddress, invoiceId, signature } = body;

    if (!walletAddress || !invoiceId || !signature) {
      return NextResponse.json<PaymentVerifyResponse>(
        { success: false, verified: false, error: 'Missing required fields / 缺少必要欄位' },
        { status: 400 }
      );
    }

    // In production:
    // 1. Use pump.fun SDK validateInvoicePayment to verify the payment on-chain
    // 2. Check that the signature is valid and confirmed
    // 3. Verify the payment amount matches the invoice
    // 4. Mark the invoice as paid in the database
    // 5. Unlock the corresponding service (radar subscription / insurance policy)

    // Mock verification — in production this would check the blockchain
    const isValidSignature = signature.length >= 64;

    if (!isValidSignature) {
      return NextResponse.json<PaymentVerifyResponse>({
        success: true,
        verified: false,
        error: 'Invalid transaction signature / 無效的交易簽名',
      });
    }

    // Unlock service based on invoice type
    // In production, look up the invoice to determine service type
    // and activate the appropriate subscription/policy

    return NextResponse.json<PaymentVerifyResponse>({
      success: true,
      verified: true,
    });
  } catch (error) {
    console.error('Payment verify error:', error);
    return NextResponse.json<PaymentVerifyResponse>(
      {
        success: false,
        verified: false,
        error: error instanceof Error ? error.message : 'Verification failed / 驗證失敗',
      },
      { status: 500 }
    );
  }
}
