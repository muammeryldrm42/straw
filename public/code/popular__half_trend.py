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
def halfTrend(c):
    if len(c) < 40:
        return make_signal(reason="Insufficient data")
    amp = 2
    closes = [x['close'] for x in c]
    highMa = sma([x['high'] for x in c], amp)
    lowMa = sma([x['low'] for x in c], amp)
    a = atr(c, 14)
    i = len(c) - 1
    # Basitleştirilmiş HalfTrend: trend yönü highMa/lowMa kırılımına göre
    trend = [0]
    for k in range(1, len(c)):
        tr = trend[k - 1]
        if closes[k] > highMa[k - 1]:
            tr = 1
        elif closes[k] < lowMa[k - 1]:
            tr = -1
        trend.append(tr)
    if trend[i - 1] <= 0  and  trend[i] > 0:
        return mk(c, i, "long", a, 0.71, "HalfTrend flipped bullish")
    if trend[i - 1] >= 0  and  trend[i] < 0:
        return mk(c, i, "short", a, 0.71, "HalfTrend flipped bearish")
    return make_signal(reason="HalfTrend unchanged")
