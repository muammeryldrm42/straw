from common import make_signal, ema, sma, rsi, macd, atr, bollinger_bands, vwap, swing_highs, swing_lows
import math


def _sign(x):
    return (x > 0) - (x < 0)


def mkBreak(c, i, side, slPrice, conf, reason):
    cur = c[i]
    if side == "long":
        r = cur['close'] - slPrice
        if r <= 0:
            return make_signal(reason="Invalid risk")
        return make_signal(signal="long", entry=cur['close'], stop_loss=slPrice, take_profit=[cur['close'] + r * 1.5, cur['close'] + r * 2.5, cur['close'] + r * 4], confidence=conf, reason=reason)
    r = slPrice - cur['close']
    if r <= 0:
        return make_signal(reason="Invalid risk")
    return make_signal(signal="short", entry=cur['close'], stop_loss=slPrice, take_profit=[cur['close'] - r * 1.5, cur['close'] - r * 2.5, cur['close'] - r * 4], confidence=conf, reason=reason)
def linReg(values, idx, p):
    sx = 0
    sy = 0
    sxy = 0
    sxx = 0
    for k in range(0, p):
        x = k
        y = values[idx - p + 1 + k]
        sx += x
        sy += y
        sxy += x * y
        sxx += x * x
    n = p
    slope = (n * sxy - sx * sy) / (n * sxx - sx * sx)
    intercept = (sy - slope * sx) / n
    end = slope * (p - 1) + intercept
    # std error
    se = 0
    for k in range(0, p):
        pred = slope * k + intercept
        se += (values[idx - p + 1 + k] - pred) ** 2
    return {'slope': slope, 'end': end, 'stderr': math.sqrt(se / p)}
def bbPercentB(c):
    if len(c) < 30:
        return make_signal(reason="Insufficient data")
    closes = [x['close'] for x in c]
    bb = bollingerBands(closes, 20, 2)
    i = len(c) - 1
    a = atr(c, 14)
    def pctB(idx):
        d = bb['upper'][idx] - bb['lower'][idx]
        return ((closes[idx] - bb['lower'][idx]) / d if d else 0.5)
    now = pctB(i)
    prev = pctB(i - 1)
    if prev < 0  and  now >= 0:
        return mkBreak(c, i, "long", bb['lower'][i] - a[i], 0.7, "BB %B re-entered from below 0")
    if prev > 1  and  now <= 1:
        return mkBreak(c, i, "short", bb['upper'][i] + a[i], 0.7, "BB %B re-entered from above 1")
    return make_signal(reason=f"BB %B {(now * 100)}%")
