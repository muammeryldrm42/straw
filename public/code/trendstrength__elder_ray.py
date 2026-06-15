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
def elderRay(c):
    if len(c) < 30:
        return make_signal(reason="Insufficient data")
    closes = [x['close'] for x in c]
    e = ema(closes, 13)
    i = len(c) - 1
    a = atr(c, 14)
    bull = c[i]['high'] - e[i]
    bear = c[i]['low'] - e[i]
    bullPrev = c[i - 1]['high'] - e[i - 1]
    bearPrev = c[i - 1]['low'] - e[i - 1]
    # Uptrend (EMA yukarı) + bear power negatiften artıyor = long
    if e[i] > e[i - 1]  and  bear < 0  and  bear > bearPrev:
        return mk(c, i, "long", a, 0.7, "Elder Ray: bear power rising in uptrend")
    if e[i] < e[i - 1]  and  bull > 0  and  bull < bullPrev:
        return mk(c, i, "short", a, 0.7, "Elder Ray: bull power falling in downtrend")
    return make_signal(reason="Elder Ray neutral")
