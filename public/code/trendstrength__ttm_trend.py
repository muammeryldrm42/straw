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
def ttmTrend(c):
    if len(c) < 30:
        return make_signal(reason="Insufficient data")
    i = len(c) - 1
    a = atr(c, 14)
    # son 6 mumun ortalaması referans
    ref = sum((x['high'] + x['low']) / 2 for x in c[i - 5: i + 1]) / 6
    closesUp = all(x['close'] > ref for x in c[i - 2: i + 1])
    closesDn = all(x['close'] < ref for x in c[i - 2: i + 1])
    prevRef = sum((x['high'] + x['low']) / 2 for x in c[i - 6: i]) / 6
    prevUp = c[i - 1]['close'] > prevRef
    if closesUp  and  not prevUp:
        return mk(c, i, "long", a, 0.69, "TTM Trend flipped up")
    if closesDn  and  prevUp:
        return mk(c, i, "short", a, 0.69, "TTM Trend flipped down")
    return make_signal(reason="TTM Trend unchanged")
