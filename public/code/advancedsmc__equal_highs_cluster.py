from common import make_signal, ema, sma, rsi, macd, atr, bollinger_bands, vwap, swing_highs, swing_lows
import math


def _sign(x):
    return (x > 0) - (x < 0)


def mkA(c, i, side, slPrice, tps, conf, reason):
    cur = c[i]
    if side == "long"  and  cur['close'] - slPrice <= 0:
        return make_signal(reason="Invalid risk")
    if side == "short"  and  slPrice - cur['close'] <= 0:
        return make_signal(reason="Invalid risk")
    return make_signal(signal=side, entry=cur['close'], stop_loss=slPrice, take_profit=tps, confidence=conf, reason=reason)
def equalHighsCluster(c):
    if len(c) < 40:
        return make_signal(reason="Insufficient data")
    sh = swingHighs(c, 4)
    sl = swingLows(c, 4)
    i = len(c) - 1
    a = atr(c, 14)
    cur = c[i]
    highs = []
    lows = []
    for k in range(max(0, i - 40), i):
        if sh[k] != None:
            highs.append(sh[k])
        if sl[k] != None:
            lows.append(sl[k])
    # 2+ eşit high -> sweep edilirse short
    eqHigh = [h for h in highs if any(j != idx  and  abs(h - h2) / h < 0.004 for h2 in highs)]
    eqLow = [l for l in lows if any(j != idx  and  abs(l - l2) / l < 0.004 for l2 in lows)]
    if len(eqHigh) >= 2:
        lvl = max(eqHigh)
        if cur['high'] > lvl  and  cur['close'] < lvl:
            return mkA(c, i, "short", cur['high'] + a[i] * 0.5, [cur['close'] - a[i] * 2, cur['close'] - a[i] * 4], 0.72, "Equal-highs liquidity swept + rejection")
    if len(eqLow) >= 2:
        lvl = min(eqLow)
        if cur['low'] < lvl  and  cur['close'] > lvl:
            return mkA(c, i, "long", cur['low'] - a[i] * 0.5, [cur['close'] + a[i] * 2, cur['close'] + a[i] * 4], 0.72, "Equal-lows liquidity swept + reversal")
    return make_signal(reason="No equal-level sweep")
