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
def swing(c, end, span=50):
    w = c[end - span + 1: end + 1]
    hiIdx = 0
    loIdx = 0
    for k in range(0, len(w)):
        if w[k]['high'] > w[hiIdx]['high']:
            hiIdx = k
        if w[k]['low'] < w[loIdx]['low']:
            loIdx = k
    hi = w[hiIdx]['high']
    lo = w[loIdx]['low']
    up = hiIdx > loIdx
    # son hareket yukarı mı (high low'dan sonra geldi)
    return {'hi': hi, 'lo': lo, 'up': up, 'range': hi - lo}
def goldenPocket(c):
    if len(c) < 60:
        return make_signal(reason="Insufficient data")
    i = len(c) - 1
    a = atr(c, 14)
    s = swing(c, i)
    if s.range <= 0:
        return make_signal(reason="No swing")
    if s['up']:
        gpTop = s['hi'] - s.range * 0.618
        gpBot = s['hi'] - s.range * 0.65
        if c[i]['low'] <= gpTop  and  c[i]['low'] >= gpBot - a[i] * 0.5  and  c[i]['close'] > c[i]['open']:
            return mk(c, i, "long", gpBot - a[i], [c[i]['close'] + s.range * 0.4, s['hi']], 0.73, "Golden pocket (0.618–0.65) long")
    else:
        gpBot = s['lo'] + s.range * 0.618
        gpTop = s['lo'] + s.range * 0.65
        if c[i]['high'] >= gpBot  and  c[i]['high'] <= gpTop + a[i] * 0.5  and  c[i]['close'] < c[i]['open']:
            return mk(c, i, "short", gpTop + a[i], [c[i]['close'] - s.range * 0.4, s['lo']], 0.73, "Golden pocket (0.618–0.65) short")
    return make_signal(reason="Not in golden pocket")
