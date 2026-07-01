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
def jumpAcrossCreek(c):
    if len(c) < 40:
        return make_signal(reason="Insufficient data")
    i = len(c) - 1
    a = atr(c, 14)
    _d = range(c, i - 30, i - 2)
    hi = _d['hi']
    lo = _d['lo']
    # Önceki bar dirençi kırdı, bu bar geri test edip tutuyor (backup to the creek)
    brokeRecently = any(x['close'] > hi for x in c[i - 4: i])
    if brokeRecently  and  c[i]['low'] <= hi + a[i]  and  c[i]['close'] > hi  and  c[i]['close'] > c[i]['open']:
        return mk(c, i, "long", hi - a[i] * 1.5, [c[i]['close'] + (hi - lo) * 0.5, c[i]['close'] + (hi - lo)], 0.71, "Jump Across the Creek (breakout + backup hold)")
    return make_signal(reason="No creek jump")
