from common import make_signal, ema, sma, rsi, macd, atr, bollinger_bands, vwap, swing_highs, swing_lows
import math


def _sign(x):
    return (x > 0) - (x < 0)


def pivots(c, lb=5):
    sh = swingHighs(c, lb)
    sl = swingLows(c, lb)
    highs = []
    lows = []
    for i in range(0, len(c)):
        if sh[i] != None:
            highs.append({'idx': i, 'price': sh[i]})
        if sl[i] != None:
            lows.append({'idx': i, 'price': sl[i]})
    return {'highs': highs, 'lows': lows}
def doubleTop(c):
    if len(c) < 50:
        return make_signal(reason="Insufficient data")
    _d = pivots(c, 5)
    highs = _d['highs']
    lows = _d['lows']
    if len(highs) < 2  or  len(lows) < 1:
        return make_signal(reason="Not enough pivots")
    t2 = highs[len(highs) - 1]
    t1 = highs[len(highs) - 2]
    a = atr(c, 14)
    i = len(c) - 1
    cur = c[i]
    # İki tepe birbirine yakın (%1.5)
    if abs(t2.price - t1.price) / t1.price > 0.015:
        return make_signal(reason="Tops not equal")
    neckline = min([l.price for l in [l for l in lows if l.idx > t1.idx  and  l.idx < t2.idx]], float('inf'))
    if not math.isfinite(neckline):
        return make_signal(reason="No neckline")
    # Neckline kırılımı
    if cur['close'] < neckline  and  c[i - 1]['close'] >= neckline:
        sl = t2.price + 0.5 * a[i]
        r = neckline - cur['close']
        height = t2.price - neckline
        return make_signal(signal="short", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] - height * 0.5, cur['close'] - height, cur['close'] - height * 1.5], confidence=0.74, reason="Double Top neckline break")
    return make_signal(reason="Double Top forming")
