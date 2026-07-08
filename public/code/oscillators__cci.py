from common import make_signal, ema, sma, rsi, macd, atr, bollinger_bands, vwap, swing_highs, swing_lows
import math


def _sign(x):
    return (x > 0) - (x < 0)


def cci(c):
    if len(c) < 40:
        return make_signal(reason="Insufficient data")
    p = 20
    tp = [(x['high'] + x['low'] + x['close']) / 3 for x in c]
    smaTP = sma(tp, p)
    i = len(c) - 1
    a = atr(c, 14)
    slice = tp[i - p + 1: i + 1]
    mean = smaTP[i]
    md = sum(abs(v - mean) for v in slice) / p
    if md == 0:
        return make_signal(reason="Flat")
    cciNow = (tp[i] - mean) / (0.015 * md)
    prevSlice = tp[i - p: i]
    prevMean = smaTP[i - 1]
    prevMd = sum(abs(v - prevMean) for v in prevSlice) / p
    cciPrev = ((tp[i - 1] - prevMean) / (0.015 * prevMd) if prevMd else 0)
    cur = c[i]
    if cciPrev < -100  and  cciNow > -100:
        sl = cur['low'] - 1.5 * a[i]
        r = cur['close'] - sl
        return make_signal(signal="long", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] + r * 1.5, cur['close'] + r * 2.5, cur['close'] + r * 4], confidence=0.71, reason=f"CCI back above -100 ({cciNow})")
    if cciPrev > 100  and  cciNow < 100:
        sl = cur['high'] + 1.5 * a[i]
        r = sl - cur['close']
        return make_signal(signal="short", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] - r * 1.5, cur['close'] - r * 2.5, cur['close'] - r * 4], confidence=0.71, reason=f"CCI back below +100 ({cciNow})")
    return make_signal(reason=f"CCI {cciNow} (no cross)")
