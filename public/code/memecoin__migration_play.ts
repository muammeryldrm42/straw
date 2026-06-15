// Strategy Lab - Migration Play
import { makeSignal, Signal } from "../../common";

export interface MigrationData {
  symbol: string;
  price_usd: number;
  bonding_curve_pct: number;
  migration_target_pct: number;
  is_migrated: boolean;
  minutes_since_migration: number;
  post_mig_volume_usd: number;
  post_mig_buys: number;
  post_mig_sells: number;
}

export interface MigrationConfig {
  pre_mig_curve_pct?: number;
  post_mig_max_minutes?: number;
  min_post_mig_volume?: number;
  min_buy_ratio?: number;
}

export function checkSignal(data: MigrationData, cfg: MigrationConfig = {}): Signal {
  const preMig  = cfg.pre_mig_curve_pct ?? 95;
  const maxMins = cfg.post_mig_max_minutes ?? 30;
  const minVol  = cfg.min_post_mig_volume ?? 10000;
  const minBR   = cfg.min_buy_ratio ?? 1.3;

  const { symbol, price_usd: price, bonding_curve_pct: curve,
          migration_target_pct: target, is_migrated: migd,
          minutes_since_migration: mins, post_mig_volume_usd: vol,
          post_mig_buys: buys, post_mig_sells: sells } = data;

  if (!migd) {
    if (curve >= preMig)
      return makeSignal("long", price, price*0.9, [price*1.3, price*1.7, price*2.2], 0.6,
                        `Pre-migration setup (${curve.toFixed(1)}%/${target.toFixed(0)}%)`,
                        { symbol, stage: "pre" });
    return makeSignal("neutral", price, 0, [], 0, `Not at mig zone (${curve.toFixed(1)}%)`);
  }

  if (mins > maxMins) return makeSignal("neutral", price, 0, [], 0, `Mig too old (${mins}min)`);
  if (vol < minVol)   return makeSignal("neutral", price, 0, [], 0, `Weak post-mig vol ($${vol.toFixed(0)})`);

  const ratio = buys / Math.max(sells, 1);
  if (ratio < minBR)
    return makeSignal("neutral", price, 0, [], 0, `Selling post-mig (${ratio.toFixed(2)})`);

  let conf = 0.55;
  if (mins < 10)  conf += 0.15;
  if (ratio > 2.0)conf += 0.1;
  if (vol > 50000)conf += 0.15;
  conf = Math.min(conf, 0.9);

  return makeSignal("long", price, price*0.85, [price*1.5, price*2.5, price*4.0], conf,
                    `Post-mig pump: ${mins}min, $${vol.toFixed(0)} vol, buyR=${ratio.toFixed(2)}`,
                    { symbol, stage: "post" });
}
