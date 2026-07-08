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
def maSlope(c):
    if len(c) < 40:
        return make_signal(reason="Insufficient data")
    closes = [x['close'] for x in c]
    e = ema(closes, 21)
    a = atr(c, 14)
    i = len(c) - 1
    cur = c[i]
    slopeNow = (e[i] - e[i - 3]) / e[i - 3]
    slopePrev = (e[i - 1] - e[i - 4]) / e[i - 4]
    # Eğim sıfırdan pozitife döndü + ivme
    if slopePrev <= 0  and  slopeNow > 0  and  cur['close'] > e[i]:
        sl = cur['close'] - 2 * a[i]
        r = cur['close'] - sl
        return make_signal(signal="long", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] + r * 1.5, cur['close'] + r * 2.5, cur['close'] + r * 4], confidence=0.68, reason="EMA slope turned positive")
    if slopePrev >= 0  and  slopeNow < 0  and  cur['close'] < e[i]:
        sl = cur['close'] + 2 * a[i]
        r = sl - cur['close']
        return make_signal(signal="short", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] - r * 1.5, cur['close'] - r * 2.5, cur['close'] - r * 4], confidence=0.68, reason="EMA slope turned negative")
    return make_signal(reason="EMA slope flat")
