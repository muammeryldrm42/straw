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
def rectangle(c):
    if len(c) < 50:
        return make_signal(reason="Insufficient data")
    _d = pivots(c, 4)
    highs = _d['highs']
    lows = _d['lows']
    if len(highs) < 2  or  len(lows) < 2:
        return make_signal(reason="Not enough pivots")
    recentH = highs[-2:]
    recentL = lows[-2:]
    a = atr(c, 14)
    i = len(c) - 1
    cur = c[i]
    resistance = sum(h.price for h in recentH) / len(recentH)
    support = sum(l.price for l in recentL) / len(recentL)
    # Tepeler ve dipler düz (rectangle)
    flatRes = abs(recentH[0].price - recentH[1].price) / resistance < 0.015
    flatSup = abs(recentL[0].price - recentL[1].price) / support < 0.015
    if not flatRes  or  not flatSup:
        return make_signal(reason="No rectangle")
    height = resistance - support
    if cur['close'] > resistance  and  c[i - 1]['close'] <= resistance:
        return make_signal(signal="long", entry=cur['close'], stop_loss=resistance - height * 0.5, take_profit=[cur['close'] + height * 0.5, cur['close'] + height, cur['close'] + height * 1.5], confidence=0.71, reason="Rectangle breakout up")
    if cur['close'] < support  and  c[i - 1]['close'] >= support:
        return make_signal(signal="short", entry=cur['close'], stop_loss=support + height * 0.5, take_profit=[cur['close'] - height * 0.5, cur['close'] - height, cur['close'] - height * 1.5], confidence=0.71, reason="Rectangle breakdown down")
    return make_signal(reason="Price inside rectangle")
