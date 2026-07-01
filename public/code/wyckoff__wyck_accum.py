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
def accumulation(c):
    if len(c) < 50:
        return make_signal(reason="Insufficient data")
    i = len(c) - 1
    a = atr(c, 14)
    _d = range(c, i - 30, i - 1)
    lo = _d['lo']
    hi = _d['hi']
    tight = (hi - lo) < a[i] * 6
    # dar konsolidasyon = birikim
    avgV = sum(x['volume'] for x in c[i - 20: i]) / 20
    if tight  and  c[i]['close'] > hi  and  c[i]['volume'] > avgV * 1.3:
        return mk(c, i, "long", lo, [c[i]['close'] + (hi - lo), c[i]['close'] + (hi - lo) * 2], 0.71, "Accumulation range breakout (markup phase)")
    return make_signal(reason="No accumulation breakout")
