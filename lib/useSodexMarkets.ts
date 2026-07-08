"use client";
import { useEffect, useState } from "react";

export interface SodexMarket { symbol: string; base: string; maxLeverage: number | null; raw?: string; }

// SoDEX marketlerini bir kez çekip cache'ler. value olarak "SODEX:BTC-USD" döner.
let cache: SodexMarket[] | null = null;

export function useSodexMarkets() {
  const [markets, setMarkets] = useState<SodexMarket[]>(cache || []);
  useEffect(() => {
    if (cache) { setMarkets(cache); return; }
    let alive = true;
    fetch("/api/sodex-markets")
      .then((r) => r.json())
      .then((d) => { if (alive && Array.isArray(d.markets)) { cache = d.markets; setMarkets(d.markets); } })
      .catch(() => {});
    return () => { alive = false; };
  }, []);
  return markets;
}
