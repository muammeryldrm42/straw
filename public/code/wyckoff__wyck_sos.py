from common import make_signal, ema, sma, rsi, macd, atr, bollinger_bands, vwap, swing_highs, swing_lows
import math


def _sign(x):
    return (x > 0) - (x < 0)


def mk(c, i, side, slPrice, tps, conf, reason):
    cur = c[i]
    if side == "long"  and  cur['close'] - slPrice <= 0:
        return make_signal(reason="Invalid risk")
    if side == "short"  and  slPrice - cur['close'] <= 0:
        return make_signal(reason="Invalid risk")
    return make_signal(signal=side, entry=cur['close'], stop_loss=slPrice, take_profit=tps, confidence=conf, reason=reason)
def range(c, s, e):
    w = c[s: e + 1]
    return {'hi': max([x['high'] for x in w]), 'lo': min([x['low'] for x in w])}
def signOfStrength(c):
    if len(c) < 40:
        return make_signal(reason="Insufficient data")
    i = len(c) - 1
    a = atr(c, 14)
    _d = range(c, i - 25, i - 1)
    hi = _d['hi']
    avgV = sum(x['volume'] for x in c[i - 20: i]) / 20
    if c[i]['close'] > hi  and  c[i]['close'] > c[i]['open']  and  (c[i]['close'] - c[i]['open']) > a[i]  and  c[i]['volume'] > avgV * 1.5:
        return mk(c, i, "long", hi - a[i], [c[i]['close'] + a[i] * 2, c[i]['close'] + a[i] * 4], 0.72, "Sign of Strength (range break + volume surge)")
    return make_signal(reason="No SOS")
