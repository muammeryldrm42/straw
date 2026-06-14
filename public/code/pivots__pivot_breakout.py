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
def pivotBreakout(c):
    if len(c) < 30:
        return make_signal(reason="Insufficient data")
    _d = prevHLC(c)
    high = _d['high']
    low = _d['low']
    close = _d['close']
    pp = (high + low + close) / 3
    rng = high - low
    r2 = pp + rng
    s2 = pp - rng
    i = len(c) - 1
    cur = c[i]
    prev = c[i - 1]
    vol = [x['volume'] for x in c]
    avgV = sum(b for b in vol[-20:]) / 20
    if cur['close'] > r2  and  prev['close'] <= r2  and  cur['volume'] > avgV * 1.3:
        return mkP(c, i, "long", pp, [r2 + rng * 0.5, r2 + rng], 0.71, "Strong breakout above R2 + volume")
    if cur['close'] < s2  and  prev['close'] >= s2  and  cur['volume'] > avgV * 1.3:
        return mkP(c, i, "short", pp, [s2 - rng * 0.5, s2 - rng], 0.71, "Strong breakdown below S2 + volume")
    return make_signal(reason="Inside R2/S2")
