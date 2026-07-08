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
def ascendingTriangle(c):
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
    flatTop = abs(h2.price - h1.price) / h1.price < 0.015
    risingLows = l2.price > l1.price
    if flatTop  and  risingLows  and  cur['close'] > h2.price  and  c[i - 1]['close'] <= h2.price:
        sl = l2.price
        r = cur['close'] - sl
        return make_signal(signal="long", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] + r * 0.7, cur['close'] + r * 1.3, cur['close'] + r * 2], confidence=0.73, reason="Ascending triangle breakout")
    return make_signal(reason="No ascending triangle break")
