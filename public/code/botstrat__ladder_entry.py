from common import make_signal, ema, sma, rsi, macd, atr, bollinger_bands, vwap, swing_highs, swing_lows
import math


def _sign(x):
    return (x > 0) - (x < 0)


def mk(c, i, side, a, conf, reason, slM=2, tpM=[1.5, 2.5, 4]):
    cur = c[i]
    if side == "long":
        sl = cur['close'] - slM * a[i]
        r = cur['close'] - sl
        return make_signal(signal="long", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] + r * m for m in tpM], confidence=conf, reason=reason)
    sl = cur['close'] + slM * a[i]
    r = sl - cur['close']
    return make_signal(signal="short", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] - r * m for m in tpM], confidence=conf, reason=reason)
def ladderEntry(c):
    if len(c) < 50:
        return make_signal(reason="Insufficient data")
    i = len(c) - 1
    a = atr(c, 14)
    cur = c[i]
    win = c[i - 40: i]
    lo = min([x['low'] for x in win])
    hi = max([x['high'] for x in win])
    support = lo + (hi - lo) * 0.236
    # alt ladder seviyesi
    if abs(cur['low'] - support) < a[i] * 0.7  and  cur['close'] > cur['open']:
        return mk(c, i, "long", a, 0.69, "Ladder entry at lower support tier", 2.5, [1.5, 3, 5])
    resistance = hi - (hi - lo) * 0.236
    if abs(cur['high'] - resistance) < a[i] * 0.7  and  cur['close'] < cur['open']:
        return mk(c, i, "short", a, 0.69, "Ladder entry at upper resistance tier", 2.5, [1.5, 3, 5])
    return make_signal(reason="Not at a ladder tier")
