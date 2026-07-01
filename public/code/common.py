"""
common.py — shared indicator helpers used by every strategy in this library.

A Candle is a dict: {"time": int, "open": float, "high": float,
                     "low": float, "close": float, "volume": float}
Every strategy returns a Signal dict via make_signal().
"""
from typing import List, Dict, Optional


def make_signal(signal: Optional[str] = None, entry: float = 0.0, stop_loss: float = 0.0,
                take_profit: Optional[List[float]] = None, confidence: float = 0.0,
                reason: str = "") -> Dict:
    return {
        "signal": signal,                      # "long" | "short" | None
        "entry": entry,
        "stop_loss": stop_loss,
        "take_profit": take_profit or [],
        "confidence": confidence,
        "reason": reason,
    }


def ema(values: List[float], period: int) -> List[float]:
    out, k, e = [], 2.0 / (period + 1), values[0] if values else 0.0
    for i, v in enumerate(values):
        e = v if i == 0 else v * k + e * (1 - k)
        out.append(e)
    return out


def sma(values: List[float], period: int) -> List[float]:
    out = []
    for i in range(len(values)):
        if i < period - 1:
            out.append(values[i])
        else:
            out.append(sum(values[i - period + 1:i + 1]) / period)
    return out


def rsi(closes: List[float], period: int = 14) -> List[float]:
    out, gain, loss = [50.0], 0.0, 0.0
    for i in range(1, len(closes)):
        ch = closes[i] - closes[i - 1]
        g, l = max(ch, 0.0), max(-ch, 0.0)
        if i <= period:
            gain += g
            loss += l
            if i == period:
                gain /= period
                loss /= period
                out.append(100 - 100 / (1 + gain / loss) if loss else 100.0)
            else:
                out.append(50.0)
        else:
            gain = (gain * (period - 1) + g) / period
            loss = (loss * (period - 1) + l) / period
            out.append(100 - 100 / (1 + gain / loss) if loss else 100.0)
    return out


def atr(candles: List[Dict], period: int = 14) -> List[float]:
    trs = []
    for i in range(len(candles)):
        if i == 0:
            trs.append(candles[i]["high"] - candles[i]["low"])
        else:
            h, l, pc = candles[i]["high"], candles[i]["low"], candles[i - 1]["close"]
            trs.append(max(h - l, abs(h - pc), abs(l - pc)))
    out, a = [], 0.0
    for i, tr in enumerate(trs):
        if i < period:
            a += tr
            out.append(a / (i + 1))
        else:
            a = (out[-1] * (period - 1) + tr) / period
            out.append(a)
    return out


def macd(closes: List[float], fast: int = 12, slow: int = 26, signal: int = 9) -> Dict:
    ef, es = ema(closes, fast), ema(closes, slow)
    macd_line = [ef[i] - es[i] for i in range(len(closes))]
    sig = ema(macd_line, signal)
    hist = [macd_line[i] - sig[i] for i in range(len(closes))]
    return {"macd": macd_line, "signal": sig, "histogram": hist}


def bollinger_bands(closes: List[float], period: int = 20, mult: float = 2.0) -> Dict:
    mid, up, lo = [], [], []
    for i in range(len(closes)):
        if i < period - 1:
            mid.append(closes[i]); up.append(closes[i]); lo.append(closes[i])
        else:
            w = closes[i - period + 1:i + 1]
            m = sum(w) / period
            sd = (sum((x - m) ** 2 for x in w) / period) ** 0.5
            mid.append(m); up.append(m + mult * sd); lo.append(m - mult * sd)
    return {"middle": mid, "upper": up, "lower": lo}


def vwap(candles: List[Dict], period: int = 20) -> List[float]:
    out = []
    for i in range(len(candles)):
        s = max(0, i - period + 1)
        pv = sum(((c["high"] + c["low"] + c["close"]) / 3) * c["volume"] for c in candles[s:i + 1])
        vol = sum(c["volume"] for c in candles[s:i + 1])
        out.append(pv / vol if vol else candles[i]["close"])
    return out


def swing_highs(candles: List[Dict], lookback: int = 2) -> List[int]:
    idx = []
    for i in range(lookback, len(candles) - lookback):
        if all(candles[i]["high"] >= candles[i - j]["high"] and
               candles[i]["high"] >= candles[i + j]["high"] for j in range(1, lookback + 1)):
            idx.append(i)
    return idx


def swing_lows(candles: List[Dict], lookback: int = 2) -> List[int]:
    idx = []
    for i in range(lookback, len(candles) - lookback):
        if all(candles[i]["low"] <= candles[i - j]["low"] and
               candles[i]["low"] <= candles[i + j]["low"] for j in range(1, lookback + 1)):
            idx.append(i)
    return idx
