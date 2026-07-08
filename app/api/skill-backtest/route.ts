// GET /api/skill-backtest — 24 skill'in her birini long-only BTC spot stratejisi olarak backtest eder.
// Gerçek CMC geçmişi (F&G + dominance + BTC/ETH OHLCV) çeker; erişilemezse sentetik seriye düşer.
// ?synthetic=1 sentetik seriyi zorlar.
import { NextResponse } from "next/server";
import { runSkillBacktest } from "@/lib/skillBacktest";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const days = Math.min(Math.max(Number(searchParams.get("days")) || 1460, 60), 1500);
  const forceMock = searchParams.get("synthetic") === "1";
  try {
    const result = await runSkillBacktest(days, forceMock);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "backtest failed" }, { status: 500 });
  }
}
