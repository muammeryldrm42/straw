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
def aroonCalc(c, end, p):
    win = c[end - p: end + 1]
    hiIdx = 0
    loIdx = 0
    for k in range(0, len(win)):
        if win[k]['high'] >= win[hiIdx]['high']:
            hiIdx = k
        if win[k]['low'] <= win[loIdx]['low']:
            loIdx = k
    up = ((p - (p - hiIdx)) / p) * 100
    dn = ((p - (p - loIdx)) / p) * 100
    return {'up': up, 'dn': dn}
def randomWalk(c):
    if len(c) < 30:
        return make_signal(reason="Insufficient data")
    p = 14
    a = atr(c, p)
    i = len(c) - 1
    denom = a[i] * math.sqrt(p)
    rwiHigh = ((c[i]['high'] - c[i - p]['low']) / denom if denom else 0)
    rwiLow = ((c[i]['low'] - c[i - p]['high']) / -denom if denom else 0)
    if rwiHigh > 1  and  rwiHigh > rwiLow:
        return mk(c, i, "long", atr(c, 14), 0.69, f"Random Walk uptrend ({rwiHigh})")
    if rwiLow > 1  and  rwiLow > rwiHigh:
        return mk(c, i, "short", atr(c, 14), 0.69, f"Random Walk downtrend ({rwiLow})")
    return make_signal(reason="Random walk (no trend)")
