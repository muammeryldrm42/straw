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
def fibPivot(c):
    if len(c) < 30:
        return make_signal(reason="Insufficient data")
    _d = prevHLC(c)
    high = _d['high']
    low = _d['low']
    close = _d['close']
    pp = (high + low + close) / 3
    rng = high - low
    r1 = pp + 0.382 * rng
    s1 = pp - 0.382 * rng
    r2 = pp + 0.618 * rng
    s2 = pp - 0.618 * rng
    i = len(c) - 1
    cur = c[i]
    prev = c[i - 1]
    if cur['close'] > r1  and  prev['close'] <= r1:
        return mkP(c, i, "long", pp, [r2, pp + rng], 0.69, "Fib pivot R1 breakout")
    if cur['close'] < s1  and  prev['close'] >= s1:
        return mkP(c, i, "short", pp, [s2, pp - rng], 0.69, "Fib pivot S1 breakdown")
    return make_signal(reason="Between fib pivots")
