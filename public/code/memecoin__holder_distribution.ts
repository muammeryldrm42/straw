// Strategy Lab - Holder Distribution Analysis
import { makeSignal, Signal } from "../../common";

export interface HolderData {
  symbol: string;
  price_usd: number;
  holder_count: number;
  top1_pct: number;
  top10_pct: number;
  dev_insider_pct: number;
  holder_growth_24h_pct: number;
}

export interface HolderConfig {
  max_top1_pct?: number;
  max_top10_pct?: number;
  max_dev_insider_pct?: number;
  min_holders?: number;
  danger_top1_pct?: number;
  danger_top10_pct?: number;
}

export function checkSignal(data: HolderData, cfg: HolderConfig = {}): Signal {
  const maxTop1   = cfg.max_top1_pct ?? 8;
  const maxTop10  = cfg.max_top10_pct ?? 40;
  const maxDev    = cfg.max_dev_insider_pct ?? 15;
  const minHold   = cfg.min_holders ?? 100;
  const dangerT1  = cfg.danger_top1_pct ?? 20;
  const dangerT10 = cfg.danger_top10_pct ?? 75;

  const { symbol, price_usd: price, holder_count: holders,
          top1_pct: top1, top10_pct: top10,
          dev_insider_pct: devInsider, holder_growth_24h_pct: growth } = data;

  if (holders <= 0 || price <= 0)
    return makeSignal("neutral", price, 0, [], 0, "No holder data");

  // Tehlikeli konsantrasyon -> SHORT
  if (top1 > dangerT1 || top10 > dangerT10)
    return makeSignal("short", price, price * 1.3,
      [price * 0.7, price * 0.5, price * 0.3], 0.7,
      `DANGER concentration: top1=${top1.toFixed(1)}% top10=${top10.toFixed(1)}%`,
      { symbol });

  // Skorlama
  const reasons: string[] = [];
  let score = 0;
  const maxScore = 5;

  if (top1 <= maxTop1) score++; else reasons.push(`top1 ${top1.toFixed(1)}%`);
  if (top10 <= maxTop10) score++; else reasons.push(`top10 ${top10.toFixed(1)}%`);
  if (devInsider <= maxDev) score++; else reasons.push(`dev/insider ${devInsider.toFixed(1)}%`);
  if (holders >= minHold) score++; else reasons.push(`holders ${holders}`);
  if (growth > 5) score++; else reasons.push(`growth ${growth.toFixed(1)}%`);

  if (score >= 4) {
    let conf = 0.5 + (score - 4) * 0.1;
    if (top1 < 5) conf += 0.1;
    if (holders > 500) conf += 0.1;
    conf = Math.min(conf, 0.9);
    return makeSignal("long", price, price * 0.7,
      [price * 1.5, price * 2.5, price * 4.0], conf,
      `Healthy dist (${score}/${maxScore}): top1=${top1.toFixed(1)}% top10=${top10.toFixed(1)}% holders=${holders}`,
      { symbol, score });
  }

  return makeSignal("neutral", price, 0, [], 0,
    `Weak dist (${score}/${maxScore}): ${reasons.join(", ")}`,
    { symbol, score });
}
