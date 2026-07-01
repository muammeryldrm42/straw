from common import make_signal, ema, sma, rsi, macd, atr, bollinger_bands, vwap, swing_highs, swing_lows
import math


def _sign(x):
    return (x > 0) - (x < 0)


def mk(c, i, side, a, conf, reason, m=2):
    cur = c[i]
    if side == "long":
        sl = cur['close'] - m * a[i]
        r = cur['close'] - sl
        return make_signal(signal="long", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] + r * 1.5, cur['close'] + r * 2.5, cur['close'] + r * 4], confidence=conf, reason=reason)
    sl = cur['close'] + m * a[i]
    r = sl - cur['close']
    return make_signal(signal="short", entry=cur['close'], stop_loss=sl, take_profit=[cur['close'] - r * 1.5, cur['close'] - r * 2.5, cur['close'] - r * 4], confidence=conf, reason=reason)
def aroonCalc(c, end, p):
    win = c[end - p: end + 1]
    hiIdx = 0
    loIdx = 0
    for k in range(0, len(win)):
        if win[k]['high'] >= win[hiIdx]['high']:
            hiIdx = k
        if win[k]['low'] <= win[loIdx]['low']:
            loIdx = k
    up = ((p - (p - hiIdx)) / p) * 100
    dn = ((p - (p - loIdx)) / p) * 100
    return {'up': up, 'dn': dn}
def vortexStrength(c):
    if len(c) < 30:
        return make_signal(reason="Insufficient data")
    p = 14
    vmP = []
    vmM = []
    tr = []
    for k in range(1, len(c)):
        vmP.append(abs(c[k]['high'] - c[k - 1]['low']))
        vmM.append(abs(c[k]['low'] - c[k - 1]['high']))
        tr.append(max(c[k]['high'] - c[k]['low'], abs(c[k]['high'] - c[k - 1]['close']), abs(c[k]['low'] - c[k - 1]['close'])))
    sum = lambda arr, e: sum(b for b in arr[e - p + 1: e + 1])
    j = len(vmP) - 1
    viP = sum(vmP, j) / sum(tr, j)
    viM = sum(vmM, j) / sum(tr, j)
    i = len(c) - 1
    a = atr(c, 14)
    if viP > 1.1  and  viP > viM:
        return mk(c, i, "long", a, 0.7, f"Strong vortex uptrend (VI+ {viP})")
    if viM > 1.1  and  viM > viP:
        return mk(c, i, "short", a, 0.7, f"Strong vortex downtrend (VI- {viM})")
    return make_signal(reason="Weak vortex trend")
