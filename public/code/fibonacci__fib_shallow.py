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
def fibShallow(c):
    if len(c) < 60:
        return make_signal(reason="Insufficient data")
    i = len(c) - 1
    a = atr(c, 14)
    s = swing(c, i)
    if s.range <= 0:
        return make_signal(reason="No swing")
    if s['up']:
        f382 = s['hi'] - s.range * 0.382
        if abs(c[i]['low'] - f382) < a[i]  and  c[i]['close'] > c[i]['open']:
            return mk(c, i, "long", f382 - a[i] * 1.5, [s['hi'], s['hi'] + s.range * 0.3], 0.7, "Shallow 0.382 pullback (strong uptrend)")
    else:
        f382 = s['lo'] + s.range * 0.382
        if abs(c[i]['high'] - f382) < a[i]  and  c[i]['close'] < c[i]['open']:
            return mk(c, i, "short", f382 + a[i] * 1.5, [s['lo'], s['lo'] - s.range * 0.3], 0.7, "Shallow 0.382 pullback (strong downtrend)")
    return make_signal(reason="Not at 0.382")
