// SoDEX base sembolünü kategoriye ayırır ve crypto olup olmadığını belirler.
// market-tickers ve sodex-markets route'ları bunu paylaşır ki filtreleme tutarlı olsun.

export const COMMODITIES = ["XAU", "XAG", "XPT", "XPD", "WTI", "BRENT", "OIL", "GOLD", "SILVER", "NATGAS", "GAS", "COPPER", "PLATINUM", "PALLADIUM", "NG", "CL"];
export const STOCKS = ["AAPL", "TSLA", "NVDA", "MSFT", "GOOGL", "GOOG", "AMZN", "META", "MSTR", "COIN", "SPY", "QQQ", "NFLX", "AMD", "PLTR", "HOOD", "MARA", "RIOT", "GME", "BABA"];

export type MarketCategory = "crypto" | "stocks" | "commodities" | "index";

export function categorize(base: string, rawCat?: string): MarketCategory {
  const c = (rawCat || "").toLowerCase();
  if (c.includes("stock") || c.includes("equity") || c.includes("rwa")) return "stocks";
  if (c.includes("commodit") || c.includes("metal") || c.includes("energy")) return "commodities";
  if (c.includes("index")) return "index";
  const b = base.toUpperCase();
  if (b.includes("MAG7") || b.includes("SPX") || b.includes("NDX") || b.endsWith(".SSI") || b.includes("INDEX")) return "index";
  if (COMMODITIES.includes(b)) return "commodities";
  if (STOCKS.includes(b)) return "stocks";
  return "crypto";
}

// Sadece crypto perp'leri tutmak için filtre. Emtia/hisse/index'leri (NATGAS, XAU, AAPL, SPX...) eler.
export function isCrypto(base: string, rawCat?: string): boolean {
  return categorize(base, rawCat) === "crypto";
}

// SoDEX'te listeli görünen ama gerçekte trade edilemeyen / sorun çıkaran semboller — her yerden elenir.
export const EXCLUDED = ["NATGAS"];
export function isExcluded(base: string): boolean {
  return EXCLUDED.includes((base || "").toUpperCase());
}
