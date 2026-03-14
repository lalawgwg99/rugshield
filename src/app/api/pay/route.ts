import { NextRequest, NextResponse } from 'next/server';
import { PumpAgent } from '@pump-fun/agent-payments-sdk';
import { PublicKey, Connection, Transaction, ComputeBudgetProgram } from '@solana/web3.js';

export async function POST(req: NextRequest) {
  const { walletAddress, amount, serviceType } = await req.json();
  
  const connection = new Connection(process.env.SOLANA_RPC_URL!);
  const agentMint = new PublicKey(process.env.AGENT_TOKEN_MINT_ADDRESS!);
  const currencyMint = new PublicKey(process.env.CURRENCY_MINT!);
  
  const agent = new PumpAgent(agentMint, 'mainnet', connection);
  const userPublicKey = new PublicKey(walletAddress);
  
  // Generate unique invoice params
  const memo = String(Math.floor(Math.random() * 900000000000) + 100000);
  const now = Math.floor(Date.now() / 1000);
  const startTime = String(now);
  const endTime = String(now + 86400); // 24h validity
  const amountSmallest = String(Math.round(amount * 1_000_000)); // USDC 6 decimals
  
  const instructions = await agent.buildAcceptPaymentInstructions({
    user: userPublicKey,
    currencyMint,
    amount: amountSmallest,
    memo,
    startTime,
    endTime,
  });
  
  const { blockhash } = await connection.getLatestBlockhash('confirmed');
  const tx = new Transaction();
  tx.recentBlockhash = blockhash;
  tx.feePayer = userPublicKey;
  tx.add(
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100_000 }),
    ...instructions
  );
  
  const serializedTx = tx.serialize({ requireAllSignatures: false }).toString('base64');
  
  return NextResponse.json({
    transaction: serializedTx,
    invoice: { memo, startTime, endTime, amount: amountSmallest, serviceType },
  });
}
