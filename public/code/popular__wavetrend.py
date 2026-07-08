from common import make_signal, ema, sma, rsi, macd, atr, bollinger_bands, vwap, swing_highs, swing_lows
import math


def _sign(x):
    return (x > 0) - (x < 0)


def mk(c, i, side, a, conf, reason, m=2):
    cur = c[i]
    if side == "long":
        sl = cur['close'] - m * a[i]
        r = cur['close'] - sl
        return make_signal(signal="long", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] + r * 1.5, cur['close'] + r * 2.5, cur['close'] + r * 4], confidence=conf, reason=reason)
    sl = cur['close'] + m * a[i]
    r = sl - cur['close']
    return make_signal(signal="short", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] - r * 1.5, cur['close'] - r * 2.5, cur['close'] - r * 4], confidence=conf, reason=reason)
def hma(values, period):
    def wma(arr, p):
        out = []
        for i in range(0, len(arr)):
            if i < p - 1:
                out.append(arr[i])
                continue
            num = 0
            den = 0
            for k in range(0, p):
                w = p - k
                num += arr[i - k] * w
                den += w
            out.append(num / den)
        return out
    half = max(1, math.floor(period / 2))
    sqrtP = max(1, round(math.sqrt(period)))
    w1 = wma(values, half)
    w2 = wma(values, period)
    raw = [2 * v - w2[i] for i, v in enumerate(w1)]
    return wma(raw, sqrtP)
def keltner(c, p, mult):
    closes = [x['close'] for x in c]
    mid = ema(closes, p)
    a = atr(c, p)
    return {'mid': mid, 'upper': [v + mult * a[i] for i, v in enumerate(mid)], 'lower': [v - mult * a[i] for i, v in enumerate(mid)]}
def waveTrend(c):
    if len(c) < 50:
        return make_signal(reason="Insufficient data")
    ap = [(x['high'] + x['low'] + x['close']) / 3 for x in c]
    esa = ema(ap, 10)
    d = ema([abs(v - esa[i]) for i, v in enumerate(ap)], 10)
    ci = [(((v - esa[i]) / (0.015 * d[i]) if d[i] else 0)) for i, v in enumerate(ap)]
    wt1 = ema(ci, 21)
    wt2 = sma(wt1, 4)
    a = atr(c, 14)
    i = len(c) - 1
    if wt1[i - 1] <= wt2[i - 1]  and  wt1[i] > wt2[i]  and  wt1[i] < -53:
        return mk(c, i, "long", a, 0.73, "WaveTrend bullish cross (oversold)")
    if wt1[i - 1] >= wt2[i - 1]  and  wt1[i] < wt2[i]  and  wt1[i] > 53:
        return mk(c, i, "short", a, 0.73, "WaveTrend bearish cross (overbought)")
    return make_signal(reason=f"WaveTrend {wt1[i]}")
