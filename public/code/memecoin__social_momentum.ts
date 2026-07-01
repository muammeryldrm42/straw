// Strategy Lab - Social Mention Velocity
import { makeSignal, Signal } from "../../common";

export interface SocialData {
  symbol: string;
  price_usd: number;
  mentions_now: number;
  mentions_1h_ago: number;
  mentions_6h_ago: number;
  sentiment_score: number;
  kol_mentions: number;
  unique_authors_1h: number;
}

export interface SocialConfig {
  min_mentions_now?: number;
  min_velocity_pct?: number;
  min_sentiment?: number;
  min_unique_authors?: number;
}

export function checkSignal(data: SocialData, cfg: SocialConfig = {}): Signal {
  const minM     = cfg.min_mentions_now ?? 20;
  const minVel   = cfg.min_velocity_pct ?? 50;
  const minSent  = cfg.min_sentiment ?? 0.2;
  const minAuth  = cfg.min_unique_authors ?? 10;

  const { symbol, price_usd: price, mentions_now: mN, mentions_1h_ago: m1, mentions_6h_ago: m6,
          sentiment_score: sent, kol_mentions: kol, unique_authors_1h: authors } = data;

  if (mN < minM) return makeSignal("neutral", price, 0, [], 0, `Low mentions (${mN})`);

  const velocity = ((mN - m1) / Math.max(m1, 1)) * 100;
  if (velocity < minVel)   return makeSignal("neutral", price, 0, [], 0, `Weak velocity (${velocity.toFixed(0)}%/h)`);
  if (sent < minSent)      return makeSignal("neutral", price, 0, [], 0, `Weak sentiment (${sent.toFixed(2)})`);
  if (authors < minAuth)   return makeSignal("neutral", price, 0, [], 0, `Few authors (${authors})`);

  let conf = 0.5;
  if (velocity > 200) conf += 0.15;
  if (sent > 0.6)     conf += 0.1;
  if (kol >= 1)       conf += 0.15;
  if (authors > 50)   conf += 0.1;
  conf = Math.min(conf, 0.95);

  return makeSignal("long", price, price*0.7, [price*1.5, price*2.5, price*4.0], conf,
                    `Social: ${mN} mentions (+${velocity.toFixed(0)}%/h), sent=${sent.toFixed(2)}, KOL=${kol}`,
                    { symbol, velocity_pct: velocity });
}
