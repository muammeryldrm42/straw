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
def descendingTriangle(c):
    if len(c) < 50:
        return make_signal(reason="Insufficient data")
    _d = pivots(c, 4)
    highs = _d['highs']
    lows = _d['lows']
    if len(highs) < 2  or  len(lows) < 2:
        return make_signal(reason="Not enough pivots")
    h2 = highs[len(highs) - 1]
    h1 = highs[len(highs) - 2]
    l2 = lows[len(lows) - 1]
    l1 = lows[len(lows) - 2]
    a = atr(c, 14)
    i = len(c) - 1
    cur = c[i]
    flatBottom = abs(l2.price - l1.price) / l1.price < 0.015
    fallingHighs = h2.price < h1.price
    if flatBottom  and  fallingHighs  and  cur['close'] < l2.price  and  c[i - 1]['close'] >= l2.price:
        sl = h2.price
        r = sl - cur['close']
        return make_signal(signal="short", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] - r * 0.7, cur['close'] - r * 1.3, cur['close'] - r * 2], confidence=0.73, reason="Descending triangle breakdown")
    return make_signal(reason="No descending triangle break")
