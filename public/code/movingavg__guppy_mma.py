from common import make_signal, ema, sma, rsi, macd, atr, bollinger_bands, vwap, swing_highs, swing_lows
import math


def _sign(x):
    return (x > 0) - (x < 0)


def hma(values, period):
    def wma(arr, p, end):
        if end < p - 1:
            return float('nan')
        num = 0
        den = 0
        for k in range(0, p):
            num += arr[end - k] * (p - k)
            den += (p - k)
        return num / den
    half = math.floor(period / 2)
    sq = math.floor(math.sqrt(period))
    raw = []
    for i in range(0, len(values)):
        w1 = wma(values, half, i)
        w2 = wma(values, period, i)
        raw.append((float('nan') if math.isnan(w1)  or  math.isnan(w2) else 2 * w1 - w2))
    out = []
    for i in range(0, len(raw)):
        if i < period + sq:
            out.append(float('nan'))
            continue
        num = 0
        den = 0
        for k in range(0, sq):
            v = raw[i - k]
            if not math.isnan(v):
                num += v * (sq - k)
                den += (sq - k)
        out.append((num / den if den else float('nan')))
    return out
def guppyMMA(c):
    if len(c) < 70:
        return make_signal(reason="Insufficient data")
    closes = [x['close'] for x in c]
    shortP = [3, 5, 8, 10, 12, 15]
    longP = [30, 35, 40, 45, 50, 60]
    i = len(c) - 1
    cur = c[i]
    a = atr(c, 14)
    shortMAs = [ema(closes, p)[i] for p in shortP]
    longMAs = [ema(closes, min(p, math.floor(len(c) / 2)))[i] for p in longP]
    shortMin = min(shortMAs)
    shortMax = max(shortMAs)
    longMax = max(longMAs)
    longMin = min(longMAs)
    # Kısa grup tamamen uzun grubun üstünde = güçlü uptrend
    if shortMin > longMax:
        prevShortMin = min([ema(closes, p)[i - 3] for p in shortP])
        prevLongMax = max([ema(closes, min(p, math.floor(len(c) / 2)))[i - 3] for p in longP])
        if prevShortMin <= prevLongMax:
            sl = cur['close'] - 2.5 * a[i]
            r = cur['close'] - sl
            return make_signal(signal="long", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] + r * 2, cur['close'] + r * 3, cur['close'] + r * 5], confidence=0.74, reason="Guppy ribbon flipped bullish (short group over long)")
    if shortMax < longMin:
        prevShortMax = max([ema(closes, p)[i - 3] for p in shortP])
        prevLongMin = min([ema(closes, min(p, math.floor(len(c) / 2)))[i - 3] for p in longP])
        if prevShortMax >= prevLongMin:
            sl = cur['close'] + 2.5 * a[i]
            r = sl - cur['close']
            return make_signal(signal="short", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] - r * 2, cur['close'] - r * 3, cur['close'] - r * 5], confidence=0.74, reason="Guppy ribbon flipped bearish (short group under long)")
    return make_signal(reason="Guppy ribbon not aligned")
