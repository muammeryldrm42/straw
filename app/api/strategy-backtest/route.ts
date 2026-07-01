// GET /api/strategy-backtest — tüm stratejileri long+short BTC spot olarak backtest eder.
// Gerçek CMC OHLCV (high/low/volume dahil) çeker; erişilemezse sentetik seriye düşer.
import { NextResponse } from "next/server";
import { runStrategyBacktest } from "@/lib/strategyBacktest";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const revalidate = 0;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const days = Math.min(Math.max(Number(searchParams.get("days")) || 1460, 200), 1500);
  const forceMock = searchParams.get("synthetic") === "1";
  try {
    return NextResponse.json(await runStrategyBacktest(days, forceMock));
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 });
  }
}
