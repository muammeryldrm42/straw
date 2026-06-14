from common import make_signal, ema, sma, rsi, macd, atr, bollinger_bands, vwap, swing_highs, swing_lows
import math


def _sign(x):
    return (x > 0) - (x < 0)


def ote(c):
    if len(c) < 220:
        return make_signal(reason="Insufficient data")
    closes = [x['close'] for x in c]
    a = atr(c, 14)
    e = ema(closes, 200)
    cur = c[len(c) - 1]
    price = cur['close']
    trend = ("up" if price > e[len(e) - 1] else "down")
    sh = swingHighs(c, 10)
    sl = swingLows(c, 10)
    shi = -1
    sli = -1
    lastH = float('nan')
    lastL = float('nan')
    for i in range(len(sh) - 1, (0)-1, -1):
        if sh[i] != None  and  shi == -1:
            shi = i
            lastH = sh[i]
        if sl[i] != None  and  sli == -1:
            sli = i
            lastL = sl[i]
        if shi != -1  and  sli != -1:
            break
    if math.isnan(lastH)  or  math.isnan(lastL):
        return make_signal(reason="No swing structure")
    if shi > sli:
        lo = lastH - (lastH - lastL) * 0.79
        hi = lastH - (lastH - lastL) * 0.62
        if price >= lo  and  price <= hi  and  trend == "up":
            entry = (lo + hi) / 2
            slv = lastL - 0.3 * a[len(a) - 1]
            r = entry - slv
            return make_signal(signal="long", entry=entry, stop_loss=slv, take_profit=[entry + r * 2, entry + r * 3, lastH], confidence=0.77, reason="OTE long (0.62-0.79 fib)")
    else:
        lo = lastL + (lastH - lastL) * 0.62
        hi = lastL + (lastH - lastL) * 0.79
        if price >= lo  and  price <= hi  and  trend == "down":
            entry = (lo + hi) / 2
            slv = lastH + 0.3 * a[len(a) - 1]
            r = slv - entry
            return make_signal(signal="short", entry=entry, stop_loss=slv, take_profit=[entry - r * 2, entry - r * 3, lastL], confidence=0.77, reason="OTE short (0.62-0.79 fib)")
    return make_signal(reason="Price not in OTE zone")
