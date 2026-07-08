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
def accelerationBands(c):
    if len(c) < 30:
        return make_signal(reason="Insufficient data")
    p = 20
    i = len(c) - 1
    prev = c[i - 1]
    upper = []
    lower = []
    for k in range(0, len(c)):
        factor = 4 * (c[k]['high'] - c[k]['low']) / (c[k]['high'] + c[k]['low'])
        upper.append(c[k]['high'] * (1 + factor))
        lower.append(c[k]['low'] * (1 - factor))
    upBand = sma(upper, p)
    loBand = sma(lower, p)
    if c[i]['close'] > upBand[i]  and  prev['close'] <= upBand[i - 1]:
        return mkBreak(c, i, "long", sma([x['close'] for x in c], p)[i], 0.7, "Acceleration band breakout up")
    if c[i]['close'] < loBand[i]  and  prev['close'] >= loBand[i - 1]:
        return mkBreak(c, i, "short", sma([x['close'] for x in c], p)[i], 0.7, "Acceleration band breakdown")
    return make_signal(reason="Inside acceleration bands")
