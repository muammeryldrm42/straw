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
def inverseHeadShoulders(c):
    if len(c) < 60:
        return make_signal(reason="Insufficient data")
    _d = pivots(c, 4)
    highs = _d['highs']
    lows = _d['lows']
    if len(lows) < 3  or  len(highs) < 2:
        return make_signal(reason="Not enough pivots")
    [ls, head, rs] = lows[-3:]
    a = atr(c, 14)
    i = len(c) - 1
    cur = c[i]
    if not (head.price < ls.price  and  head.price < rs.price):
        return make_signal(reason="No iH&S structure")
    if abs(ls.price - rs.price) / ls.price > 0.03:
        return make_signal(reason="Shoulders uneven")
    neckHighs = [h for h in highs if h.idx > ls.idx  and  h.idx < rs.idx]
    if len(neckHighs) < 1:
        return make_signal(reason="No neckline")
    neckline = sum(h.price for h in neckHighs) / len(neckHighs)
    if cur['close'] > neckline  and  c[i - 1]['close'] <= neckline:
        sl = rs.price - 0.5 * a[i]
        height = neckline - head.price
        return make_signal(signal="long", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] + height * 0.5, cur['close'] + height, cur['close'] + height * 1.5], confidence=0.76, reason="Inverse H&S neckline break")
    return make_signal(reason="iH&S forming")
