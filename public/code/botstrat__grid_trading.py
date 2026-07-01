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
def gridTrading(c):
    if len(c) < 40:
        return make_signal(reason="Insufficient data")
    i = len(c) - 1
    a = atr(c, 14)
    win = c[i - 30: i]
    hi = max([x['high'] for x in win])
    lo = min([x['low'] for x in win])
    range = hi - lo
    levels = 5
    step = range / levels
    cur = c[i]
    # Alt gridlere değince long (range içinde mean reversion)
    lowerGrid = lo + step
    upperGrid = hi - step
    if cur['low'] <= lowerGrid  and  cur['close'] > lowerGrid  and  range / lo < 0.4:
        return mk(c, i, "long", a, 0.69, f"Grid buy @ lower band (range {lo}-{hi})", 2, [1, 2, 3])
    if cur['high'] >= upperGrid  and  cur['close'] < upperGrid  and  range / lo < 0.4:
        return mk(c, i, "short", a, 0.69, f"Grid sell @ upper band", 2, [1, 2, 3])
    return make_signal(reason="Price mid-grid (no fill)")
