from common import make_signal, ema, sma, rsi, macd, atr, bollinger_bands, vwap, swing_highs, swing_lows
import math


def _sign(x):
    return (x > 0) - (x < 0)


def mkS(c, i, side, a, conf, reason, m=2):
    cur = c[i]
    if side == "long":
        sl = cur['close'] - m * a[i]
        r = cur['close'] - sl
        return make_signal(signal="long", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] + r * 1.5, cur['close'] + r * 2.5, cur['close'] + r * 4], confidence=conf, reason=reason)
    sl = cur['close'] + m * a[i]
    r = sl - cur['close']
    return make_signal(signal="short", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] - r * 1.5, cur['close'] - r * 2.5, cur['close'] - r * 4], confidence=conf, reason=reason)
def linRegFull(values, idx, p):
    sx = 0
    sy = 0
    sxy = 0
    sxx = 0
    syy = 0
    for k in range(0, p):
        x = k
        y = values[idx - p + 1 + k]
        sx += x
        sy += y
        sxy += x * y
        sxx += x * x
        syy += y * y
    n = p
    slope = (n * sxy - sx * sy) / (n * sxx - sx * sx)
    intercept = (sy - slope * sx) / n
    r2num = (n * sxy - sx * sy) ** 2
    r2den = (n * sxx - sx * sx) * (n * syy - sy * sy)
    return {'slope': slope, 'intercept': intercept, 'r2': (r2num / r2den if r2den else 0), 'end': slope * (p - 1) + intercept}
def polyRegression(c):
    if len(c) < 40:
        return make_signal(reason="Insufficient data")
    closes = [x['close'] for x in c]
    p = 15
    i = len(c) - 1
    a = atr(c, 14)
    # İkinci dereceden eğrinin son eğimi (basit fark yaklaşımı)
    f = linRegFull(closes, i, p).end
    fPrev = linRegFull(closes, i - 1, p).end
    fPrev2 = linRegFull(closes, i - 2, p).end
    curve = f - 2 * fPrev + fPrev2
    # ikinci türev
    vel = f - fPrev
    if curve > 0  and  vel > 0  and  closes[i] > f:
        return mkS(c, i, "long", a, 0.67, "Polynomial curve accelerating up")
    if curve < 0  and  vel < 0  and  closes[i] < f:
        return mkS(c, i, "short", a, 0.67, "Polynomial curve accelerating down")
    return make_signal(reason="Polynomial curve flat")
