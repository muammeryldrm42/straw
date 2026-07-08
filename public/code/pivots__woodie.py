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
def woodie(c):
    if len(c) < 30:
        return make_signal(reason="Insufficient data")
    _d = prevHLC(c)
    high = _d['high']
    low = _d['low']
    i = len(c) - 1
    cur = c[i]
    prev = c[i - 1]
    pp = (high + low + 2 * cur['open']) / 4
    r1 = 2 * pp - low
    s1 = 2 * pp - high
    if cur['close'] > pp  and  prev['close'] <= pp:
        return mkP(c, i, "long", s1, [r1, r1 + (high - low)], 0.68, "Woodie pivot bullish")
    if cur['close'] < pp  and  prev['close'] >= pp:
        return mkP(c, i, "short", r1, [s1, s1 - (high - low)], 0.68, "Woodie pivot bearish")
    return make_signal(reason="At Woodie pivot")
