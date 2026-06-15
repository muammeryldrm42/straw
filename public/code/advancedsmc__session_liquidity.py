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
def sessionLiquidity(c):
    if len(c) < 30:
        return make_signal(reason="Insufficient data")
    i = len(c) - 1
    a = atr(c, 14)
    cur = c[i]
    win = c[i - 20: i]
    hi = max([x['high'] for x in win])
    lo = min([x['low'] for x in win])
    # Sweep low sonra dönüş = long
    if cur['low'] < lo  and  cur['close'] > lo  and  cur['close'] > cur['open']:
        return mkA(c, i, "long", cur['low'] - a[i] * 0.5, [cur['close'] + (hi - cur['close']) * 0.5, hi], 0.72, "Session-low liquidity sweep + reversal")
    if cur['high'] > hi  and  cur['close'] < hi  and  cur['close'] < cur['open']:
        return mkA(c, i, "short", cur['high'] + a[i] * 0.5, [cur['close'] - (cur['close'] - lo) * 0.5, lo], 0.72, "Session-high liquidity sweep + reversal")
    return make_signal(reason="No session sweep")
