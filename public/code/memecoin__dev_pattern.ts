// Strategy Lab - Dev Wallet & First Buyers Pattern
import { makeSignal, Signal } from "../../common";

export interface DevPatternData {
  symbol: string;
  price_usd: number;
  dev_hold_pct: number;
  dev_sold_pct: number;
  top10_concentration_pct: number;
  bundled_wallets_pct: number;
  insider_wallets_count: number;
  is_mint_authority_renounced: boolean;
  is_freeze_authority_renounced: boolean;
}

export interface DevPatternConfig {
  max_dev_hold_pct?: number;
  max_top10_pct?: number;
  max_bundled_pct?: number;
  dev_dump_pct?: number;
}

export function checkSignal(data: DevPatternData, cfg: DevPatternConfig = {}): Signal {
  const maxDev    = cfg.max_dev_hold_pct ?? 15;
  const maxTop10  = cfg.max_top10_pct ?? 40;
  const maxBundle = cfg.max_bundled_pct ?? 30;
  const dumpThr   = cfg.dev_dump_pct ?? 30;

  const { symbol, price_usd: price, dev_hold_pct: devH, dev_sold_pct: devS,
          top10_concentration_pct: top10, bundled_wallets_pct: bundled,
          insider_wallets_count: insiders,
          is_mint_authority_renounced: mintR, is_freeze_authority_renounced: freezeR } = data;

  if (devS >= dumpThr)
    return makeSignal("short", price, price*1.10, [price*0.85, price*0.65, price*0.40], 0.85,
                     `DEV DUMP detected (${devS.toFixed(1)}% sold)`);

  if (!mintR || !freezeR)
    return makeSignal("neutral", price, 0, [], 0,
                     `Authority not renounced (mint=${mintR}, freeze=${freezeR})`);

  if (devH > maxDev)      return makeSignal("neutral", price, 0, [], 0, `Dev hold too high (${devH.toFixed(1)}%)`);
  if (top10 > maxTop10)   return makeSignal("neutral", price, 0, [], 0, `Top10 too high (${top10.toFixed(1)}%)`);
  if (bundled > maxBundle)return makeSignal("neutral", price, 0, [], 0, `Bundled too high (${bundled.toFixed(1)}%)`);

  let conf = 0.5;
  if (devH < 5)      conf += 0.15;
  if (top10 < 25)    conf += 0.1;
  if (bundled < 15)  conf += 0.1;
  if (insiders === 0)conf += 0.1;
  conf = Math.min(conf, 0.95);

  return makeSignal("long", price, price*0.65, [price*1.5, price*2.5, price*4.0], conf,
                    `Clean dist: dev=${devH.toFixed(1)}% top10=${top10.toFixed(1)}% bundled=${bundled.toFixed(1)}%`,
                    { symbol });
}
