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
def fibChannel(c):
    if len(c) < 60:
        return make_signal(reason="Insufficient data")
    win = c[-50:]
    hi = max([x['high'] for x in win])
    lo = min([x['low'] for x in win])
    range = hi - lo
    i = len(c) - 1
    a = atr(c, 14)
    f382 = lo + range * 0.382
    f618 = lo + range * 0.618
    # 0.382 destekten dönüş = long, 0.618 dirençten = short
    if abs(c[i]['low'] - f382) < a[i] * 0.5  and  c[i]['close'] > c[i]['open']:
        return mkBreak(c, i, "long", f382 - a[i], 0.69, "Fib 0.382 support bounce")
    if abs(c[i]['high'] - f618) < a[i] * 0.5  and  c[i]['close'] < c[i]['open']:
        return mkBreak(c, i, "short", f618 + a[i], 0.69, "Fib 0.618 resistance rejection")
    return make_signal(reason="Not at fib level")
