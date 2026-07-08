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
def rangeFilter(c):
    if len(c) < 40:
        return make_signal(reason="Insufficient data")
    closes = [x['close'] for x in c]
    per = 14
    mult = 2.618
    absChg = [((0 if i == 0 else abs(v - closes[i - 1]))) for i, v in enumerate(closes)]
    avrng = ema(absChg, per)
    smrng = [v * mult for v in ema(avrng, per * 2 - 1)]
    filt = [closes[0]]
    for i in range(1, len(c)):
        prev = filt[i - 1]
        f = prev
        if closes[i] > prev:
            f = (prev if closes[i] - smrng[i] < prev else closes[i] - smrng[i])
        else:
            f = (prev if closes[i] + smrng[i] > prev else closes[i] + smrng[i])
        filt.append(f)
    i = len(c) - 1
    a = atr(c, 14)
    if filt[i] > filt[i - 1]  and  closes[i] > filt[i]  and  closes[i - 1] <= filt[i - 1]:
        return mk(c, i, "long", a, 0.7, "Range Filter bullish breakout")
    if filt[i] < filt[i - 1]  and  closes[i] < filt[i]  and  closes[i - 1] >= filt[i - 1]:
        return mk(c, i, "short", a, 0.7, "Range Filter bearish breakout")
    return make_signal(reason="Inside range filter")
