import { NextRequest, NextResponse } from 'next/server';
import { PumpAgent } from '@pump-fun/agent-payments-sdk';
import { PublicKey, Connection } from '@solana/web3.js';

export async function POST(req: NextRequest) {
  const { walletAddress, invoice, signature } = await req.json();
  
  const connection = new Connection(process.env.SOLANA_RPC_URL!);
  const agentMint = new PublicKey(process.env.AGENT_TOKEN_MINT_ADDRESS!);
  const agent = new PumpAgent(agentMint, 'mainnet', connection);
  
  // Retry verification (tx may take a few seconds to confirm)
  let verified = false;
  for (let attempt = 0; attempt < 10; attempt++) {
    verified = await agent.validateInvoicePayment({
      user: new PublicKey(walletAddress),
      currencyMint: new PublicKey(process.env.CURRENCY_MINT!),
      amount: Number(invoice.amount),
      memo: Number(invoice.memo),
      startTime: Number(invoice.startTime),
      endTime: Number(invoice.endTime),
    });
    if (verified) break;
    await new Promise(r => setTimeout(r, 2000));
  }
  
  return NextResponse.json({ verified, serviceType: invoice.serviceType });
}
