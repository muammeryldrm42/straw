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
def pivotBands(c):
    if len(c) < 30:
        return make_signal(reason="Insufficient data")
    i = len(c) - 1
    prev = c[i - 1]
    pivot = (prev['high'] + prev['low'] + prev['close']) / 3
    r1 = 2 * pivot - prev['low']
    s1 = 2 * pivot - prev['high']
    a = atr(c, 14)
    if c[i]['close'] > r1  and  prev['close'] <= r1:
        return mkBreak(c, i, "long", pivot, 0.68, "Pivot R1 breakout")
    if c[i]['close'] < s1  and  prev['close'] >= s1:
        return mkBreak(c, i, "short", pivot, 0.68, "Pivot S1 breakdown")
    return make_signal(reason="Between pivot bands")
