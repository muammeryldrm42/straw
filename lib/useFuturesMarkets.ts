"use client";
import { useEffect, useState } from "react";

export interface FuturesMarket { symbol: string; base: string; maxLeverage: number | null; }

// Binance Futures market listesini bir kez çekip cache'ler. value = "BTCUSDT".
let cache: FuturesMarket[] | null = null;

export function useFuturesMarkets() {
  const [markets, setMarkets] = useState<FuturesMarket[]>(cache || []);
  useEffect(() => {
    if (cache) { setMarkets(cache); return; }
    let alive = true;
    fetch("/api/futures-markets")
      .then((r) => r.json())
      .then((d) => { if (alive && Array.isArray(d.markets)) { cache = d.markets; setMarkets(d.markets); } })
      .catch(() => {});
    return () => { alive = false; };
  }, []);
  return markets;
}
