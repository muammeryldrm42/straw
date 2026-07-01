from common import make_signal, ema, sma, rsi, macd, atr, bollinger_bands, vwap, swing_highs, swing_lows
import math


def _sign(x):
    return (x > 0) - (x < 0)


def mkP(c, i, side, sl, tps, conf, reason):
    cur = c[i]
    if side == "long"  and  cur['close'] - sl <= 0:
        return make_signal(reason="Invalid risk")
    if side == "short"  and  sl - cur['close'] <= 0:
        return make_signal(reason="Invalid risk")
    return make_signal(signal=side, entry=cur['close'], stop_loss=sl, take_profit=tps, confidence=conf, reason=reason)
def prevHLC(c, window=24):
    w = c[-window - 1: -1]
    return {'high': max([x['high'] for x in w]), 'low': min([x['low'] for x in w]), 'close': w[len(w) - 1]['close']}
def floorPivotBounce(c):
    if len(c) < 30:
        return make_signal(reason="Insufficient data")
    _d = prevHLC(c)
    high = _d['high']
    low = _d['low']
    close = _d['close']
    pp = (high + low + close) / 3
    r1 = 2 * pp - low
    s1 = 2 * pp - high
    a = atr(c, 14)
    i = len(c) - 1
    cur = c[i]
    # S1'e değip dönüş = long, R1'e değip dönüş = short
    if abs(cur['low'] - s1) < a[i] * 0.5  and  cur['close'] > cur['open']:
        return mkP(c, i, "long", s1 - a[i], [pp, r1], 0.68, "Bounce off S1 pivot")
    if abs(cur['high'] - r1) < a[i] * 0.5  and  cur['close'] < cur['open']:
        return mkP(c, i, "short", r1 + a[i], [pp, s1], 0.68, "Rejection at R1 pivot")
    return make_signal(reason="Not at floor pivot")
