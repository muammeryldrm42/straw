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
def donchianMid(c):
    if len(c) < 30:
        return make_signal(reason="Insufficient data")
    p = 20
    i = len(c) - 1
    hi = max([x['high'] for x in c[i - p: i]])
    lo = min([x['low'] for x in c[i - p: i]])
    mid = (hi + lo) / 2
    prevHi = max([x['high'] for x in c[i - p - 1: i - 1]])
    prevLo = min([x['low'] for x in c[i - p - 1: i - 1]])
    prevMid = (prevHi + prevLo) / 2
    a = atr(c, 14)
    if c[i - 1]['close'] <= prevMid  and  c[i]['close'] > mid:
        return mkBreak(c, i, "long", lo, 0.69, "Crossed above Donchian midline")
    if c[i - 1]['close'] >= prevMid  and  c[i]['close'] < mid:
        return mkBreak(c, i, "short", hi, 0.69, "Crossed below Donchian midline")
    return make_signal(reason="No midline cross")
